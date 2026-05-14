import configs from '@app/configs'
import axios from 'axios'
import { AppError } from 'packages/shared/src'
import httpStatus from 'http-status'
import { logger } from './logger'
export const sendMessage = async (phoneNumber: string, message: string, otp?: string) => {
  // prepare message payload:
  const payload = {
    to: phoneNumber,
    from: 'TrustedHand',
    sms: `${message} : ${otp}`,
    type: 'plain',
    api_key: configs.termiiConfig.apiKey,
    channel: 'generic',
  }

  const { data } = await axios.get(
    `${configs.termiiConfig.baseURL}/api/sender-id?api_key=${configs.termiiConfig.apiKey}`
  )

  logger.debug('GET SENDER', data.content)

  try {
    //   send message:
    const res = await axios.post(`${configs.termiiConfig.baseURL}/api/sms/send`, payload, {
      headers: {
        'Content-Type': ['application/json', 'application/json'],
      },
    })
    if (res.data.code !== 'ok') {
      throw new AppError(httpStatus.BAD_REQUEST, 'Failed to send message into phoneNumber!')
    }
    console.log('✅ Message send into phone successfully', otp)
    return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    logger.error('SMS error', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    })
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to send message into phoneNumber!')
  }
}
