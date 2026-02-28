import { notificationDeviceTypeValues } from 'packages/db/src/apps/modules/NotificationToken/notificationToken.constant'
import { optionalEnumString, requiredString } from 'packages/shared/src'
import z from 'zod'

const registerToken = z.object({
  body: z.object({
    token: requiredString(),
    deviceType: optionalEnumString(notificationDeviceTypeValues, 'Device Type'),
  }),
})

export const notificationValidations = {
  registerToken,
}

export type TRegisterToken = z.infer<typeof registerToken.shape.body>
