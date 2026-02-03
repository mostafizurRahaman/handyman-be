import { AppError, hashPassword } from '@repo/shared'
import type { TCreateAdminType, TGetAllAdminsType } from './admin.validation'
import { AuthRoles, AuthStatus, User, type IUser } from '@repo/db'
import httpStatus from 'http-status'
import configs from '@app/configs'
import { deleteSingleFileFromS3, uploadSingleFileToS3 } from '@repo/media-hub'
import { WelcomeEmail, renderEmail } from '@repo/email-templates'
import { sendEmail } from '@repo/email-sender'
import { QueryBuilder } from '@repo/shared'
import type { QueryFilter } from 'mongoose'

// 1. Create Admin:
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

  //  Prepare payload:
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
    _id: admin._id,
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

// 2. Edit Admin:
const updateAdmin = async (
  id: string,
  profileImage: Express.Multer.File,
  payload: TCreateAdminType
) => {
  const { name, phoneNumber } = payload

  // Check is user already exists with this email:
  const user = await User.findById(id)
  if (!user) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User does not exist !')
  }

  if (user?.status === AuthStatus.BLOCKED) {
    throw new AppError(httpStatus.FORBIDDEN, 'User is blocked')
  }

  if (user?.status === AuthStatus.DELETED) {
    throw new AppError(httpStatus.GONE, 'User is deleted')
  }

  if (profileImage && user?.profileImage) {
    await deleteSingleFileFromS3(user?.profileImage as string)
  }

  // upload profile image:
  const { url } = await uploadSingleFileToS3(profileImage, 'profiles')

  //  Prepare payload:
  const adminPayload = {
    name,
    phoneNumber: phoneNumber as string,
    profileImage: url as string,
  }

  // Create the admin user:
  const admin = await User.findOneAndUpdate({ _id: user?._id }, adminPayload, { new: true })

  // Prepare welcome template:
  const htmlTemplate = await renderEmail(
    WelcomeEmail({
      firstName: admin?.name as string,
      companyName: configs.site.name as string,
      actionUrl: '/login' as string,
    })
  )

  //  Send welcome email to the admin:
  await sendEmail({
    to: admin?.email as string,
    subject: `Welcome to ${configs.site.name as string}!`,
    html: htmlTemplate.html,
  })

  return {
    _id: admin?._id,
    email: admin?.email,
    name: admin?.name,
    role: admin?.role,
    status: admin?.status,
    profileImage: admin?.profileImage,
    phoneNumber: admin?.phoneNumber,
    createdAt: admin?.createdAt,
    updatedAt: admin?.updatedAt,
  }
}

// 3. Delete Admin :
const deleteAdmin = async (id: string) => {
  // Check is user already exists with this email:
  const user = await User.findById(id)
  if (!user) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User does not exist !')
  }

  if (user?.profileImage) {
    await deleteSingleFileFromS3(user?.profileImage as string)
  }

  // Create the admin user:
  const admin = await User.findOneAndDelete({ _id: user?._id })

  return {
    _id: admin?._id,
    email: admin?.email,
    name: admin?.name,
    role: admin?.role,
    status: admin?.status,
    profileImage: admin?.profileImage,
    phoneNumber: admin?.phoneNumber,
    createdAt: admin?.createdAt,
    updatedAt: admin?.updatedAt,
  }
}

// 4. Get admin by id:
const getAdminById = async (id: string) => {
  // Check is user already exists with this email:
  const user = await User.findById(id)
  if (!user) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User does not exist !')
  }

  return user
}

// 5. Get all admins :
const getAllAdmins = async (query: TGetAllAdminsType) => {
  const { fromDate, toDate, ...filters } = query

  const andConditions: QueryFilter<IUser>[] = [{ role: AuthRoles.ADMIN }]

  if (fromDate || toDate) {
    const dateCondition: Record<string, Date> = {}

    if (fromDate) {
      dateCondition.$gte = new Date(fromDate)
    }

    if (toDate) {
      dateCondition.$lte = new Date(toDate)
    }

    andConditions.push({ createdAt: dateCondition })
  }

  // 1. searchable feilds:
  const searchableFields = ['email', 'name', 'phoneNumber']

  // 2. get all admin:
  const adminQuery = new QueryBuilder(
    User.find({
      $and: andConditions,
    }),
    filters
  )
    .search(searchableFields)
    .filter()
    .sort()
    .paginate()
    .fields()

  const data = await adminQuery.modelQuery
  const meta = await adminQuery.countTotal()

  return {
    data,
    meta,
  }
}

export const AdminServices = {
  createAdmin,
  updateAdmin,
  deleteAdmin,
  getAdminById,
  getAllAdmins,
}
