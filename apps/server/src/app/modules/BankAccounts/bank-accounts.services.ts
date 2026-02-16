import axios from 'axios'
import { AppError, QueryBuilder } from 'packages/shared/src'
import httpStatus from 'http-status'
import configs from '@app/configs'
import type { TAddAccountPayloadType, TGetAccountQueryType } from './bank-accounts.validations'
import { BankAccount, type IUser } from 'packages/db/src'
import { logger } from '@app/libs/logger'

// Get bank codes:
const getBankCodes = async () => {
  try {
    const response = await axios.get('https://api.paystack.co/bank?country=nigeria', {
      headers: {
        Authorization: `Bearer ${configs.payStackConfig.secretKey}`,
      },
    })

    console.log(response?.data?.data?.length)
    return response.data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    const msg = error?.response?.data?.message || 'Failed to load bank codes'
    throw new AppError(httpStatus.BAD_REQUEST, msg)
  }
}

// Add Bank Account:
const addBankAccount = async (user: IUser, payload: TAddAccountPayloadType) => {
  const { bankCode, accountNumber } = payload

  // 1. Resolve bank account to validate
  let resolvedAccount
  try {
    const resolveRes = await axios.get(
      `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      {
        headers: {
          Authorization: `Bearer ${configs.payStackConfig.secretKey}`,
        },
      }
    )
    resolvedAccount = resolveRes.data.data // contains account_name
    logger.info('Resolved Account', resolvedAccount)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error({ error })
    const msg = error?.response?.data?.message || 'Failed to resolve bank account'
    throw new AppError(httpStatus.BAD_REQUEST, msg)
  }

  logger.info('Transfer', {
    type: 'nuban', // assuming Nigerian bank account
    name: resolvedAccount.account_name, // resolved account name
    account_number: accountNumber,
    bank_code: bankCode,
    currency: 'NGN',
  })
  // 2. Create transfer recipient in Paystack
  let transferRecipient
  try {
    const recipientRes = await axios.post(
      'https://api.paystack.co/transferrecipient',
      {
        type: 'nuban', // assuming Nigerian bank account
        name: resolvedAccount.account_name, // resolved account name
        account_number: accountNumber,
        bank_code: bankCode,
        currency: 'NGN',
      },
      {
        headers: {
          Authorization: `Bearer ${configs.payStackConfig.secretKey}`,
          'Content-Type': 'application/json',
        },
      }
    )

    transferRecipient = recipientRes.data.data

    logger.info('transferRecipient', transferRecipient)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    const msg = error?.response?.data?.message || 'Failed to create transfer recipient'
    throw new AppError(httpStatus.BAD_REQUEST, msg)
  }

  // 3. Save bank account in your DB
  try {
    const bankAccount = new BankAccount({
      user: user._id,
      bankName: transferRecipient?.details?.bank_name,
      accountNumber: accountNumber,
      accountName: resolvedAccount.account_name,
      bankCode: bankCode,
      isVerified: true,
      verifiedAt: new Date(),
      paystackRecipientCode: transferRecipient?.recipient_code, // Paystack recipient code
      currency: 'NGN',
      active: true,
    })

    await bankAccount.save()
    return {
      message: 'Bank account added successfully',
      data: bankAccount,
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    const msg = error?.response?.data?.message || 'Failed to save bank account'
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, msg)
  }
}

// Get Provider all bank accounts:
const getProviderAllBankAccounts = async (user: IUser, query: TGetAccountQueryType) => {
  // searchable fields:
  const searchableFields = ['accountName']

  const { fromDate, toDate, ...filterQuery } = query

  // Date filter
  const dateFilter: Record<string, Date> = {}
  if (fromDate) {
    dateFilter.$gte = new Date(fromDate)
  }
  if (toDate) {
    dateFilter.$lte = new Date(toDate)
  }

  // Base filter object
  const baseFilter: Record<string, unknown> = {
    user: user?._id?.toString(),
  }

  // Apply date filter if exists
  if (Object.keys(dateFilter).length > 0) {
    baseFilter.createdAt = dateFilter
  }

  const bankQuery = new QueryBuilder(BankAccount.find(baseFilter), filterQuery)
    .search(searchableFields)
    .filter()
    .sort()
    .fields()

  const data = await bankQuery.modelQuery
  const meta = await bankQuery.countTotal()

  return {
    meta,
    data,
  }
}

export const bankAccountServices = {
  getBankCodes,
  addBankAccount,
  getProviderAllBankAccounts,
}
