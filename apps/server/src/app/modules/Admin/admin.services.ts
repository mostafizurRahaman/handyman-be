import { AppError, hashPassword } from '@repo/shared'
import type { TCreateAdminType } from './admin.validation'
import { AuthRoles, AuthStatus, User } from '@repo/db'
import httpStatus from 'http-status'
import configs from '@app/configs'
import { uploadSingleFileToS3 } from '@repo/media-hub'
import { WelcomeEmail, renderEmail } from '@repo/email-templates'
import { sendEmail } from '@repo/email-sender'

const createAdmin = async (profileImage: Express.Multer.File, payload: TCreateAdminType) => {
  const { email, name, password, phoneNumber } = payload

  // Check is user already exists with this email:
  const user = await User.isUserExistByEmail(email)
  if (user) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User already exists with this email')
  }

  // upload profile image:
  const { url } = await uploadSingleFileToS3(profileImage, 'profiles')

  // Hash the password:
  const hashedPassword = await hashPassword(password, configs.passwordSoltRound)

  //   prepare payload:
  const adminPayload = {
    email,
    name,
    password: hashedPassword,
    phoneNumber: phoneNumber as string,
    profileImage: url as string,
    role: AuthRoles.ADMIN,
    isOtpVerified: true,
    status: AuthStatus.ACTIVE,
    isProfile: true,
  }
  // Create the admin user:
  const admin = await User.create(adminPayload)

  // Prepare welcome template:
  const htmlTemplate = await renderEmail(
    WelcomeEmail({
      firstName: admin.name as string,
      companyName: configs.site.name as string,
      actionUrl: '/login' as string,
    })
  )

  //  Send welcome email to the admin:
  await sendEmail({
    to: admin.email as string,
    subject: `Welcome to ${configs.site.name as string}!`,
    html: htmlTemplate.html,
  })

  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
    status: admin.status,
    profileImage: admin.profileImage,
    phoneNumber: admin.phoneNumber,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
  }
}

export const AdminServices = {
  createAdmin,
}
