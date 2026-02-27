import {
  enumString,
  requiredDate,
  requiredEmail,
  requiredNumber,
  requiredString,
} from '@repo/shared'
import { AuthRoles } from 'packages/db/src'
import z from 'zod/v4'

// 1. Signup
const signUserSchema = z.object({
  body: z.object({
    name: requiredString('Name'),
    email: requiredEmail('Email'),
    password: requiredString('Password').min(1, {
      error: `Password is required`,
    }),
    phoneNumber: requiredString('Phone Number'),
    role: enumString([AuthRoles.CUSTOMER, AuthRoles.PROVIDER], 'Role'),
  }),
})

// 2. Login
const loginSchema = z.object({
  body: signUserSchema.shape.body.pick({
    email: true,
    password: true,
  }),
})

const resendSignupOtpSchema = z.object({
  body: signUserSchema.shape.body.pick({
    email: true,
  }),
})

const verifySignupOtpSchema = z.object({
  body: signUserSchema.shape.body
    .pick({
      email: true,
    })
    .extend({
      otp: requiredString('Otp')
        .length(6, { error: 'OTP must be exactly 6 digits' })
        .regex(/^\d+$/, { error: 'OTP must contain only numbers' }),
    }),
})

const forgotPasswordSchema = z.object({
  body: signUserSchema.shape.body.pick({
    email: true,
  }),
})

const verifyResetPasswordOtpSchema = z.object({
  body: verifySignupOtpSchema.shape.body.pick({
    email: true,
    otp: true,
  }),
})

const resendOTPSchema = z.object({
  body: verifySignupOtpSchema.shape.body.pick({
    email: true,
  }),
})

const resetPasswordSchema = z.object({
  body: z.object({
    newPassword: requiredString('newPassword'),
  }),
  query: z.object({
    resetToken: requiredString('resetToken'),
  }),
})

const changedPasswordSchema = z.object({
  body: z.object({
    oldPassword: requiredString('oldPassword'),
    newPassword: requiredString('newPassword'),
  }),
})

const updateProfile = z.object({
  body: signUserSchema.shape.body.pick({
    name: true,
  }),
})

const providerSignupSchema = z.object({
  body: signUserSchema.shape.body
    .pick({
      name: true,
      email: true,
      password: true,
      phoneNumber: true,
    })
    .extend({
      serviceCategory: requiredString('Service Category Id'),
      address: requiredString('Location'),
      lat: requiredNumber('Lattitude')
        .min(-90, { message: `Lattitude must be between -90 and 90` })
        .max(90, { message: `Lattitude must be between -90 and 90` }),
      long: requiredNumber('Longitude')
        .min(-180, { message: `Longitude must be between -180 and 180` })
        .max(180, { message: `Longitude must be between -180 and 180` }),
      startTime: requiredDate('StartTime'),
      endTime: requiredDate('endTime'),
      weekdays: z.array(
        enumString(
          ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
          'Weekdays'
        )
      ),
    }),
})

export const AuthValidations = {
  signUserSchema,
  loginSchema,
  resendSignupOtpSchema,
  verifySignupOtpSchema,
  forgotPasswordSchema,
  verifyResetPasswordOtpSchema,
  resendOTPSchema,
  changedPasswordSchema,
  resetPasswordSchema,
  updateProfile,
  providerSignupSchema,
}

export type ISignUpSchemaType = z.infer<typeof signUserSchema.shape.body>
export type ILoginType = z.infer<typeof loginSchema.shape.body>
export type IResendSignupType = z.infer<typeof resendSignupOtpSchema.shape.body>
export type IVerifySignupOtpType = z.infer<typeof verifySignupOtpSchema.shape.body>
export type IForgotPasswordType = z.infer<typeof forgotPasswordSchema.shape.body>
export type IVerifyResetPasswordOtpType = z.infer<typeof verifyResetPasswordOtpSchema.shape.body>
export type IResetPasswordOtpType = z.infer<typeof resetPasswordSchema.shape.body>
export type IResetPasswordOtpQueryType = z.infer<typeof resetPasswordSchema.shape.query>
export type IChangedPasswordType = z.infer<typeof changedPasswordSchema.shape.body>
export type IUpdateProfileType = z.infer<typeof updateProfile.shape.body>
export type IProviderSignUpType = z.infer<typeof providerSignupSchema.shape.body>
