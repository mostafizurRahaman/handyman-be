// notification.service.ts

import { firebaseAdmin } from '@app/configs/firebase'
import { Notification, NotificationToken, type IUser, type NotificationType } from '@repo/db'
import type { TRegisterToken } from './notification.validation'

type CreateNotificationPayload = {
  title: string
  body: string
  type: NotificationType
  data?: Record<string, unknown>
}

/**
 * Create notification in DB and send push
 */
export const createAndSendNotification = async (
  userId: string,
  payload: CreateNotificationPayload
) => {
  // 1️⃣ Save in DB
  const notification = await Notification.create({
    user: userId,
    ...payload,
  })

  // 2️⃣ Send push (async, don't block main flow if you want)
  await sendPushNotification(userId, payload)

  return notification
}

/**
 * Send FCM push to all active user devices
 */
export const sendPushNotification = async (userId: string, payload: CreateNotificationPayload) => {
  const tokens = await NotificationToken.find({
    user: userId,
    isActive: true,
  })

  if (!tokens.length) return

  const formattedData = payload.data
    ? Object.entries(payload.data).reduce(
        (acc, [key, value]) => {
          acc[key] = String(value)
          return acc
        },
        {} as Record<string, string>
      )
    : {}

  const response = await firebaseAdmin.messaging().sendEachForMulticast({
    tokens: tokens.map((t) => t.token),
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: formattedData,
  })

  // 3️⃣ Remove invalid tokens
  await Promise.all(
    response.responses.map(async (res, index) => {
      if (!res.success) {
        await NotificationToken.findOneAndDelete({
          token: tokens[index]!.token,
        })
      }
    })
  )
}


// ** Register Device Token:
const registerToken = async (user: IUser, payload: TRegisterToken) => {
  const { token, deviceType } = payload

  await NotificationToken.find({
    user: user._id,
    deviceType,
  })

  const result = await NotificationToken.findOneAndUpdate(
    {
      user: user._id,
      deviceType,
    },
    {
      $set: {
        token,
        deviceType,
        isActive: true,
      },
    },
    { upsert: true, new: true }
  )

  return result
}

export const notificationServices = {
  createAndSendNotification,
  sendPushNotification,
  registerToken,
}
