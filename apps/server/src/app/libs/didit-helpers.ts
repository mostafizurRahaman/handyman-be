import configs from '@app/configs'
import axios from 'axios'
import type { IUser } from '@repo/db'
import { logger } from './logger'
import * as crypto from 'node:crypto'

// 1. create a didit session:
export const createDiditSession = async (user: IUser) => {
  try {
    const { data } = await axios.post(
      'https://verification.didit.me/v3/session/',
      {
        workflow_id: configs.diditConfig.diditWorkFlowId,
        vendor_data: user?._id,
        callback: 'http://localhost:5000/success',
        callback_method: 'both',
        metadata: {
          email: user.email,
          _id: user?._id,
          role: user.role,
          phoneNumber: user?.phoneNumber,
          status: user?.status,
        },
        language: 'en',
        contact_details: {
          email: user.email,
          phone: user.phoneNumber,
          send_notification_emails: true,
        },
      },
      {
        headers: {
          'x-api-key': configs.diditConfig.diditApiKey,
        },
      }
    )
    console.log(data)
    return data
  } catch (error) {
    logger.error(error)
  }
}

// 2. shortenFloats Numbers:
/**
 * Process floats to match server-side behavior.
 * Converts float values that are whole numbers to integers.
 */
export function shortenFloats(data: unknown): unknown {
  if (Array.isArray(data)) {
    return data.map(shortenFloats)
  }

  if (data !== null && typeof data === 'object') {
    return Object.fromEntries(
      Object.entries(data as Record<string, unknown>).map(([key, value]) => [
        key,
        shortenFloats(value),
      ])
    )
  }

  if (typeof data === 'number' && !Number.isInteger(data) && data % 1 === 0) {
    return Math.trunc(data)
  }

  return data
}

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

export function verifySignatureV2(
  jsonBody: JsonValue,
  signatureHeader: string,
  timestampHeader: string,
  secretKey: string
): boolean {
  // Check timestamp freshness (within 5 minutes)
  const currentTime = Math.floor(Date.now() / 1000)
  const incomingTime = Number.parseInt(timestampHeader, 10)

  if (!Number.isFinite(incomingTime)) {
    return false
  }

  if (Math.abs(currentTime - incomingTime) > 300) {
    return false
  }

  // Process floats (e.g. 5.0 → 5)
  const processedData = shortenFloats(jsonBody) as JsonValue

  // Sort keys recursively to build canonical JSON
  const sortKeys = (value: JsonValue): JsonValue => {
    if (Array.isArray(value)) {
      return value.map(sortKeys)
    }

    if (value !== null && typeof value === 'object') {
      return Object.keys(value)
        .sort()
        .reduce<Record<string, JsonValue>>((result, key) => {
          result[key] = sortKeys(value[key] as JsonValue)
          return result
        }, {})
    }

    return value
  }

  // JSON.stringify keeps Unicode unescaped (default behavior)
  const canonicalJson = JSON.stringify(sortKeys(processedData))

  const expectedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(canonicalJson, 'utf8')
    .digest('hex')

  // Prevent timing attacks & length mismatch crashes
  if (expectedSignature.length !== signatureHeader.length) {
    return false
  }

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'utf8'),
    Buffer.from(signatureHeader, 'utf8')
  )
}

// 3. Verify Signature Simple (Fallback) Function:

interface SimpleWebhookPayload {
  timestamp?: string | number
  session_id?: string
  status?: string
  webhook_type?: string
  [key: string]: unknown
}

export function verifySignatureSimple(
  jsonBody: SimpleWebhookPayload,
  signatureHeader: string,
  timestampHeader: string,
  secretKey: string
): boolean {
  // Check timestamp freshness (within 5 minutes)
  const currentTime = Math.floor(Date.now() / 1000)
  const incomingTime = Number.parseInt(timestampHeader, 10)

  if (!Number.isFinite(incomingTime)) {
    return false
  }

  if (Math.abs(currentTime - incomingTime) > 300) {
    return false
  }

  // Build canonical string from core fields
  const canonicalString = [
    jsonBody.timestamp ?? '',
    jsonBody.session_id ?? '',
    jsonBody.status ?? '',
    jsonBody.webhook_type ?? '',
  ].join(':')

  const expectedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(canonicalString, 'utf8')
    .digest('hex')

  // Prevent timingSafeEqual crash on length mismatch
  if (expectedSignature.length !== signatureHeader.length) {
    return false
  }

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'utf8'),
    Buffer.from(signatureHeader, 'utf8')
  )
}
