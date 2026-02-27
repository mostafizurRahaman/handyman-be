/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AuthRoles,
  AuthStatus,
  GetLocationPoints,
  Otp,
  otpTypes,
  Provider,
  ServiceCategory,
  User,
  VerificationModel,
  VerificationStatus,
  type IUser,
  type TAuthRole,
} from '@repo/db'
import type {
  IChangedPasswordType,
  IForgotPasswordType,
  ILoginType,
  IProviderSignUpType,
  IResendSignupType,
  IResetPasswordOtpType,
  ISignUpSchemaType,
  IUpdateProfileType,
  IVerifyResetPasswordOtpType,
  IVerifySignupOtpType,
} from './user.validations'
import {
  addTime,
  AppError,
  comparePassword,
  createToken,
  generateOtp,
  hashPassword,
  verifyToken,
  type IJwtUserPayload,
} from '@repo/shared'
// import { sendEmail } from '@repo/email-sender'
import httpStatus from 'http-status'
import configs from '@app/configs'
import mongoose, { Types } from 'mongoose'
import { renderEmail, ResetPasswordOTPEmail, SignupOTPEmail } from '@repo/email-templates'
import { sendEmail } from '@repo/email-sender'
import { createDiditSession } from '@app/libs/didit-helpers'
import { logger } from '@app/libs/logger'
import { deleteSingleFileFromS3, uploadSingleFileToS3 } from 'packages/media-hub/src'

// 1. Signup
const signUp = async (payload: ISignUpSchemaType) => {
  const { name, email, password, role, phoneNumber } = payload

  // 1. Check existing user
  const existingUser = (await User.isUserExistByEmail(email)) as IUser

  if (existingUser) {
    switch (existingUser.status) {
      case AuthStatus.ACTIVE:
        throw new AppError(
          httpStatus.CONFLICT,
          'An account with this email already exists. Please log in.'
        )

      case AuthStatus.PENDING:
        throw new AppError(
          httpStatus.CONFLICT,
          'Your account is not verified yet. Please verify your OTP.'
        )

      case AuthStatus.IN_REVIEW:
        throw new AppError(
          httpStatus.CONFLICT,
          'Your account is in review. Please wait for verification.'
        )
      case AuthStatus.BLOCKED:
        throw new AppError(
          httpStatus.FORBIDDEN,
          'Your account has been blocked. Please contact support.'
        )

      case AuthStatus.DELETED:
        throw new AppError(
          httpStatus.GONE,
          'This account was deleted. Please contact support to restore it.'
        )

      default:
        throw new AppError(httpStatus.CONFLICT, 'You already have an account.')
    }
  }

  if ([AuthRoles.SUPER_ADMIN, AuthRoles.ADMIN].includes(role as any)) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Cannot assign SUPER_ADMIN or ADMIN role during signup.'
    )
  }

  const session = await mongoose.startSession()

  try {
    session.startTransaction()

    // 2. Hash password
    const hashedPassword = await hashPassword(password, configs.passwordSoltRound)

    // 3. Create user (PENDING)
    const [newUser] = await User.create(
      [
        {
          name,
          email,
          password: hashedPassword,
          status: AuthStatus.PENDING,
          role: role as TAuthRole,
          phoneNumber: phoneNumber || '',
        },
      ],
      { session }
    )

    if (!newUser?._id) {
      throw new AppError(httpStatus.BAD_REQUEST, 'User creation failed!')
    }

    // 4. Generate OTP
    const otp = generateOtp({ length: configs.otpSettings.digits })

    // 5. Create OTP:
    const [savedOtp] = await Otp.create(
      [
        {
          user: newUser._id.toString(),
          type: otpTypes.SIGNUP,
          otp,
          expiresAt: addTime(configs.otpSettings.expiresIn, 'minutes', true),
        },
      ],
      { session }
    )

    // 6. Render Signup Template:
    const htmlTemplate = await renderEmail(
      SignupOTPEmail({
        userFirstName: name,
        companyName: configs.site.name,
        companyLogo: configs.site.logo as string,
        otpCode: savedOtp?.otp as string,
      })
    )

    // 7. Send OTP with rendered template
    await sendEmail({
      to: newUser.email,
      html: htmlTemplate.html,
      subject: 'Your OTP for Account Verification',
    })

    await session.commitTransaction()
    session.endSession()
    // await sendMessage(newUser.phoneNumber, 'Your OTP for Account Verification')

    return {
      name: newUser.name,
      email: newUser.email,
      password: '',
      status: newUser.status,
      role: newUser.role,
      isTwoFactorEnabled: newUser.isTwoFactorEnabled,
      isOtpVerified: newUser.isOtpVerified,
      _id: newUser?._id,
      createdAt: newUser?.createdAt,
      updatedAt: newUser?.updatedAt,
    }
  } catch (error: any) {
    await session.abortTransaction()
    session.endSession()
    throw new Error(error)
    logger.error(error)
  }
}

// 2. Resend Signup otp:
const resendSignupOTP = async (payload: IResendSignupType) => {
  const { email } = payload

  // 1. Check existing user
  const user = (await User.isUserExistByEmail(email)) as IUser
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, `User Doesn't exits!`)
  }

  if (user.status === AuthStatus.BLOCKED) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Your account has been blocked. Please contact support.'
    )
  }

  if (user.status === AuthStatus.DELETED) {
    throw new AppError(
      httpStatus.GONE,
      'This account was deleted. Please contact support to restore it.'
    )
  }

  if (user.isOtpVerified) {
    throw new AppError(httpStatus.CONFLICT, 'Your account already verified!')
  }

  // 2. Check Otp exists ? :
  const existingOtp = await Otp.findValidOtp(user._id?.toString(), otpTypes.SIGNUP)

  // 3. If existing otp still valid resend otp:
  if (existingOtp) {
    // Render Signup Template:
    const htmlTemplate = await renderEmail(
      SignupOTPEmail({
        userFirstName: user.name,
        companyName: configs.site.name,
        companyLogo: configs.site.logo as string,
        otpCode: existingOtp?.otp as string,
      })
    )

    //  Send OTP with rendered template
    await sendEmail({
      to: user.email,
      html: htmlTemplate.html,
      subject: 'Your OTP for Account Verification',
    })

    throw new AppError(
      httpStatus.BAD_REQUEST,
      'An OTP has already been sent and is still valid. Please check your email or wait for it to expire.'
    )
  }

  // 4. Generate new otp:
  const newOtp = generateOtp({ length: 6 })
  console.log(newOtp)

  // 5. Create OTP:
  const savedOtp = await Otp.findOneAndUpdate(
    {
      user: user._id.toString(),
      type: otpTypes.SIGNUP,
    },
    {
      user: user._id.toString(),
      type: otpTypes.SIGNUP,
      otp: newOtp,
      expiresAt: addTime(configs.otpSettings.expiresIn, 'minutes', true),
    },
    {
      new: true,
      upsert: true,
    }
  )

  // 6. Render Signup Template:
  const htmlTemplate = await renderEmail(
    SignupOTPEmail({
      userFirstName: user.name,
      companyName: configs.site.name,
      companyLogo: configs.site.logo as string,
      otpCode: savedOtp?.otp as string,
    })
  )

  // 7. Send OTP with rendered template
  await sendEmail({
    to: user.email,
    html: htmlTemplate.html,
    subject: 'Your OTP for Account Verification',
  })

  return {
    geneated: true,
  }
}

// 3. verify signup otp:
const verifySignupOTP = async (payload: IVerifySignupOtpType) => {
  const { email, otp } = payload

  //  1. check is email exits with this email:
  const user = await User.isUserExistByEmail(email)
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, `User doesn't exists!`)
  }

  // 2. check the status:
  if (user.status === AuthStatus.BLOCKED) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Your account has been blocked. Please contact support.'
    )
  }

  if (user.status === AuthStatus.DELETED) {
    throw new AppError(
      httpStatus.GONE,
      'This account was deleted. Please contact support to restore it.'
    )
  }

  // 3. Is already otp verified :
  if (user.isOtpVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, `You account already verified!`)
  }

  // 4. Find valid otp:
  const validOtp = await Otp.verifyAndConsumeOtp(user?._id?.toString(), otpTypes.SIGNUP, otp)

  if (!validOtp) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid otp!')
  }

  user.isOtpVerified = true
  let verificationUrl
  let isVerficationRequired = false

  if (user.role === AuthRoles.PROVIDER) {
    const session = await createDiditSession(user)
    logger.info('session', session)
    await VerificationModel.create({
      user: user?._id?.toString(),
      confidenceScore: 0,
      status: VerificationStatus.PENDING,
      diditSessionId: session.session_id,
    })
    verificationUrl = session.url as string
    isVerficationRequired = true

    user.status = AuthStatus.IN_REVIEW
  } else {
    user.status = AuthStatus.ACTIVE
  }

  await user.save()

  return {
    verificationUrl,
    isVerficationRequired,
  }
}

// 4. Login :
const login = async (payload: ILoginType) => {
  const { email, password } = payload

  // 1. check user
  const user = await User.findOne({ email }).select('+password')
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User doesn't exists!")
  }

  // 2. check user status:
  if (user.status === AuthStatus.BLOCKED) {
    throw new AppError(httpStatus.FORBIDDEN, 'You account is blocked. Please contact support!')
  }

  if (user.status === AuthStatus.DELETED) {
    throw new AppError(httpStatus.GONE, 'Your account is deleted!')
  }

  // 3. check is otp verified ?
  if (!user.isOtpVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Your account is not verified!')
  }

  if (user.role === AuthRoles.PROVIDER && !user.isDocumentVerified) {
    const verificaton = await VerificationModel.findOne({
      user: user?._id?.toString(),
    })

    if (!verificaton) {
      throw new AppError(
        httpStatus.UNAVAILABLE_FOR_LEGAL_REASONS,
        'Complete kyc verification first!'
      )
    }

    if (verificaton.status === 'pending') {
      throw new AppError(
        httpStatus.UNAVAILABLE_FOR_LEGAL_REASONS,
        'Please await to complete kyc verification!'
      )
    }

    if (verificaton.status === 'declined') {
      throw new AppError(
        httpStatus.UNAVAILABLE_FOR_LEGAL_REASONS,
        'Your provided documents for kyc declined! Please submit documents again!'
      )
    }
  }

  if (user.role === AuthRoles.PROVIDER && !user.isDocumentProvided) {
    throw new AppError(httpStatus.UNAVAILABLE_FOR_LEGAL_REASONS, 'Provide documents for kyc first!')
  }

  // 5. compare given password:
  const isPasswordMatched = await comparePassword(password, user.password)

  if (!isPasswordMatched) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Credential not matched!')
  }

  // 6. Prepare jwt payload:
  const jwtPayload: IJwtUserPayload = {
    _id: user._id?.toString(),
    email: user?.email,
    name: user?.name,
    profileImage: user?.profileImage as string,
    status: user?.status,
  }

  // 7. Generate access token :
  const accessToken = createToken(
    jwtPayload,
    configs.jwt.accessToken.secret,
    configs.jwt.accessToken.expiresIn
  )

  // 8. Generate refresh token
  const refreshToken = createToken(
    jwtPayload,
    configs.jwt.refreshToken.secret,
    configs.jwt.refreshToken.expiresIn
  )

  return {
    refreshToken,
    accessToken,
    email: user.email,
    role: user.role,
    isTwofactorEnabled: user.isTwoFactorEnabled,
  }
}

// 5. Forgot password
const forgotPassword = async (payload: IForgotPasswordType) => {
  const { email } = payload
  // 1. check user
  const user = await User.findOne({ email })
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User doesn't exists!")
  }

  // 2. check user status:
  if (user.status === AuthStatus.BLOCKED) {
    throw new AppError(httpStatus.FORBIDDEN, 'You account is blocked. Please contact support!')
  }

  if (user.status === AuthStatus.DELETED) {
    throw new AppError(httpStatus.GONE, 'Your account is deleted!')
  }

  // 3. check is otp verified ?
  if (!user.isOtpVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Your account is not verified!')
  }

  // 4. Has valid otp for reset password :
  const exitingOtp = await Otp.findValidOtp(user._id.toString(), otpTypes.RESET)
  if (exitingOtp) {
    throw new AppError(httpStatus.TOO_MANY_REQUESTS, 'Please wait before requesting another OTP')
  } else {
    // 8. Generate new otp
    const newOtp = generateOtp({
      length: configs.otpSettings.digits,
    })

    // 9. Store reset password otp:
    const otp = await Otp.findOneAndUpdate(
      {
        user: user?._id?.toString(),
        type: otpTypes.RESET,
      },
      {
        user: user?._id?.toString(),
        type: otpTypes.RESET,
        expiresAt: addTime(configs.otpSettings.expiresIn, 'minutes'),
        otp: newOtp,
      },
      {
        new: true,
        upsert: true,
      }
    )

    // 6. Render Reset password otp template:
    const htmlTemplate = await renderEmail(
      ResetPasswordOTPEmail({
        userFirstName: user.name,
        companyName: configs.site.name,
        companyLogo: configs.site.logo as string,
        otpCode: otp?.otp as string,
      })
    )

    // 7. Send OTP with rendered template
    await sendEmail({
      to: user.email,
      html: htmlTemplate.html,
      subject: 'OTP for reset password!',
    })
  }
}

// 6. Verify Reset password otp:
const verifyResetPasswordOtp = async (payload: IVerifyResetPasswordOtpType) => {
  const { email, otp } = payload

  // 1. check user
  const user = await User.findOne({ email })
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User doesn't exists!")
  }

  // 2. check user status:
  if (user.status === AuthStatus.BLOCKED) {
    throw new AppError(httpStatus.FORBIDDEN, 'You account is blocked. Please contact support!')
  }

  if (user.status === AuthStatus.DELETED) {
    throw new AppError(httpStatus.GONE, 'Your account is deleted!')
  }

  // 3. check is otp verified ?
  if (!user.isOtpVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Your account is not verified!')
  }

  // 4. Find valid otp:
  const validOtp = await Otp.verifyAndConsumeOtp(user?._id?.toString(), otpTypes.RESET, otp)

  if (!validOtp) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid otp!')
  }

  // 5. Reset token payload:
  const resetTokenPayload = {
    _id: user?._id?.toString(),
    email: user.email,
    name: user.name,
    profileImage: user.profileImage as string,
    status: user.status,
  }

  // 5. Reset password token:
  const resetToken = createToken(
    resetTokenPayload,
    configs.jwt.resetToken.secret,
    configs.jwt.resetToken.expiresIn
  )

  return {
    resetToken,
  }
}

// 7. Resend Signup otp:
const resendOTP = async (payload: IResendSignupType) => {
  const { email } = payload

  // 1. Check existing user
  const user = (await User.isUserExistByEmail(email)) as IUser
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, `User Doesn't exits!`)
  }

  if (user.status === AuthStatus.BLOCKED) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Your account has been blocked. Please contact support.'
    )
  }

  if (user.status === AuthStatus.DELETED) {
    throw new AppError(
      httpStatus.GONE,
      'This account was deleted. Please contact support to restore it.'
    )
  }

  if (!user.isOtpVerified) {
    throw new AppError(httpStatus.CONFLICT, 'Your account is not verified yet!')
  }

  // 2. Check Otp exists ? :
  const existingOtp = await Otp.findValidOtp(user._id?.toString(), otpTypes.RESET)

  // 3. If existing otp still valid resend otp:
  if (existingOtp) {
    // Render Signup Template:
    const htmlTemplate = await renderEmail(
      ResetPasswordOTPEmail({
        userFirstName: user.name,
        companyName: configs.site.name,
        companyLogo: configs.site.logo as string,
        otpCode: existingOtp?.otp as string,
      })
    )

    //  Send OTP with rendered template
    await sendEmail({
      to: user.email,
      html: htmlTemplate.html,
      subject: 'OTP for reset password!',
    })

    throw new AppError(
      httpStatus.BAD_REQUEST,
      'An OTP has already been sent and is still valid. Please check your email or wait for it to expire.'
    )
  }

  // 4. Generate new otp:
  const newOtp = generateOtp({ length: 6 })

  // 5. Create OTP:
  const savedOtp = await Otp.findOneAndUpdate(
    {
      user: user._id.toString(),
      type: otpTypes.RESET,
    },
    {
      user: user._id.toString(),
      type: otpTypes.RESET,
      otp: newOtp,
      expiresAt: addTime(configs.otpSettings.expiresIn, 'minutes', true),
    },
    {
      new: true,
    }
  )

  // 6. Render Signup Template:
  const htmlTemplate = await renderEmail(
    ResetPasswordOTPEmail({
      userFirstName: user.name,
      companyName: configs.site.name,
      companyLogo: configs.site.logo as string,
      otpCode: savedOtp?.otp as string,
    })
  )

  // 7. Send OTP with rendered template
  await sendEmail({
    to: user.email,
    html: htmlTemplate.html,
    subject: 'OTP for reset password!',
  })

  return {
    geneated: true,
  }
}

// 8. Reset password :
const resetPassword = async (resetToken: string, payload: IResetPasswordOtpType) => {
  const { newPassword } = payload

  // 1. Decode the reset token:
  const decoded = verifyToken(resetToken, configs.jwt.resetToken.secret)
  if (!decoded.email) {
    throw new AppError(httpStatus.FORBIDDEN, 'Invalid Token!')
  }

  // 2. Find user with this email:
  const user = await User.findOne({ email: decoded.email }).select('+password')
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User doesn't exits!")
  }

  // 3. Check user status :
  if (await User.isUserBlocked(user)) {
    throw new AppError(httpStatus.FORBIDDEN, 'You account is blocked. Please contact support!')
  }

  if (await User.isUserDeleted(user)) {
    throw new AppError(httpStatus.GONE, 'Your account is deleted!')
  }

  // 4. Compare if JWT was issued before password change:
  if (
    await User.isJwtIssuedBeforePasswordChanged(
      user.passwordChangedAt as Date,
      decoded.iat as number
    )
  ) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Your session has expired.')
  }

  // 4. Hash password:
  const hashedPassword = await hashPassword(newPassword, configs.passwordSoltRound)

  // 5. Update user password:
  await User.findOneAndUpdate(
    {
      _id: user?._id,
    },
    {
      $set: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
      },
    }
  )

  return
}

// 9. Changed password:
const changedPassword = async (userInfo: IJwtUserPayload, payload: IChangedPasswordType) => {
  const { newPassword, oldPassword } = payload

  // 1. Check is user exists with this id?:
  const user = await User.findById(userInfo._id).select('+password')
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User doesn't exists!")
  }

  // 2. Compare old password to password hash:
  const isPasswordMatched = await comparePassword(oldPassword, user.password)
  if (!isPasswordMatched) {
    throw new AppError(httpStatus.CONFLICT, 'Password not matched!')
  }

  // 3. Hash new password:
  const hashedPassword = await hashPassword(newPassword, configs.passwordSoltRound)

  // 4. Update password now:
  await User.findOneAndUpdate(
    {
      _id: user._id,
    },
    {
      password: hashedPassword,
      passwordChangedAt: new Date(),
    },
    {
      new: true,
    }
  )
}

// 10. getMe :
const getMe = async (userInfo: IJwtUserPayload) => {
  // 1. Check is user exists with this id?:
  const user = await User.findById(userInfo._id).lean()

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User doesn't exists!")
  }

  if (user.role === 'provider') {
    const provider = await Provider?.findOne({ user: user?._id }).lean()
    return {
      ...user,
      ...provider,
      _id: user?._id,
      providerId: provider?._id,
    }
  }
  return user
}

// 11. Update Profile:
export const updateProfile = async (
  userInfo: IUser,
  payload: IUpdateProfileType,
  file: Express.Multer.File
) => {
  // check is user exist? :
  const user = await User.isUserExistByEmail(userInfo.email)

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, `User does't exist`)
  }

  // if new file uploaded and has previous image url: delete
  if (file && user.profileImage) {
    await deleteSingleFileFromS3(user.profileImage)
  }

  // map previous image or upload new one:
  let url = user.profileImage
  if (file) {
    const newUploads = await uploadSingleFileToS3(file, 'profileImage')
    url = newUploads.url
  }

  user.name = payload.name || user.name
  user.profileImage = url as string
  user.save()

  return user
}

// 12. Provider Sign up only:
const providerSignUp = async (payload: IProviderSignUpType, file: Express.Multer.File) => {
  const {
    name,
    email,
    password,
    phoneNumber,
    serviceCategory,
    address,
    lat,
    long,
    startTime,
    endTime,
    weekdays,
  } = payload

  // 1. Check existing user
  const existingUser = (await User.isUserExistByEmail(email)) as IUser

  if (existingUser) {
    switch (existingUser.status) {
      case AuthStatus.ACTIVE:
        throw new AppError(
          httpStatus.CONFLICT,
          'An account with this email already exists. Please log in.'
        )

      case AuthStatus.PENDING:
        throw new AppError(
          httpStatus.CONFLICT,
          'Your account is not verified yet. Please verify your OTP.'
        )

      case AuthStatus.IN_REVIEW:
        throw new AppError(
          httpStatus.CONFLICT,
          'Your account is in review. Please wait for verification.'
        )
      case AuthStatus.BLOCKED:
        throw new AppError(
          httpStatus.FORBIDDEN,
          'Your account has been blocked. Please contact support.'
        )

      case AuthStatus.DELETED:
        throw new AppError(
          httpStatus.GONE,
          'This account was deleted. Please contact support to restore it.'
        )

      default:
        throw new AppError(httpStatus.CONFLICT, 'You already have an account.')
    }
  }

  const category = await ServiceCategory.findById(serviceCategory)
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Service category not found! ')
  }

  let url

  if (file) {
    const uploads = await uploadSingleFileToS3(file, 'profileImage')
    url = uploads.url
  }

  const session = await mongoose.startSession()

  try {
    session.startTransaction()

    // 2. Hash password
    const hashedPassword = await hashPassword(password, configs.passwordSoltRound)

    // 3. Create user (PENDING)
    const [newUser] = await User.create(
      [
        {
          name,
          email,
          password: hashedPassword,
          status: AuthStatus.PENDING,
          role: AuthRoles.PROVIDER,
          profileImage: url as string,
          phoneNumber: phoneNumber || '',
          isProfile: true,
        },
      ],
      { session }
    )

    // 4. prepare payload:
    const profilePayload = {
      user: new Types.ObjectId(newUser?._id),
      serviceCategory: new Types.ObjectId(category._id),
      address,
      location: {
        type: GetLocationPoints.Point,
        coordinates: [long, lat], // [longitude, Lattitude]
      },
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      weekdays: weekdays,
    }

    // 4. Create Profile:
    const [providerProfile] = await Provider.create([profilePayload], {
      session,
    })

    if (!newUser?._id) {
      throw new AppError(httpStatus.BAD_REQUEST, 'User creation failed!')
    }

    // 4. Generate OTP
    const otp = generateOtp({ length: configs.otpSettings.digits })

    // 5. Create OTP:
    const [savedOtp] = await Otp.create(
      [
        {
          user: newUser._id.toString(),
          type: otpTypes.SIGNUP,
          otp,
          expiresAt: addTime(configs.otpSettings.expiresIn, 'minutes', true),
        },
      ],
      { session }
    )

    // 6. Render Signup Template:
    const htmlTemplate = await renderEmail(
      SignupOTPEmail({
        userFirstName: name,
        companyName: configs.site.name,
        companyLogo: configs.site.logo as string,
        otpCode: savedOtp?.otp as string,
      })
    )

    // 7. Send OTP with rendered template
    await sendEmail({
      to: newUser.email,
      html: htmlTemplate.html,
      subject: 'Your OTP for Account Verification',
    })
    // await sendMessage(newUser.phoneNumber, 'Your OTP for Account Verification')

    await session.commitTransaction()
    session.endSession()

    return {
      _id: newUser?._id,
      name: newUser.name,
      email: newUser.email,
      password: '',
      status: newUser.status,
      role: newUser.role,
      isTwoFactorEnabled: newUser.isTwoFactorEnabled,
      isOtpVerified: newUser.isOtpVerified,
      createdAt: newUser?.createdAt,
      updatedAt: newUser?.updatedAt,
      ...providerProfile?.toObject(),
    }
  } catch (error: any) {
    await session.abortTransaction()
    session.endSession()
    throw new Error(error)
  }
}

export const AuthServices = {
  signUp,
  resendSignupOTP,
  verifySignupOTP,
  login,
  forgotPassword,
  verifyResetPasswordOtp,
  resendOTP,
  resetPassword,
  changedPassword,
  getMe,
  updateProfile,
  providerSignUp,
}
