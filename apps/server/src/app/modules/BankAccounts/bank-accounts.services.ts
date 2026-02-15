import axios from 'axios'
import { AppError } from 'packages/shared/src'
import httpStatus from 'http-status'
import configs from '@app/configs'
import type { TAddAccountPayloadType } from './bank-accounts.validations'
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
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to load bank codes')
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
  } catch (error: any) {
    console.error({ error })
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
      paystackRecipientCode: transferRecipient?.recipient_code, // Paystack recipient code
      currency: 'NGN',
      active: true,
    })

    await bankAccount.save()
    return {
      message: 'Bank account added successfully',
      data: bankAccount,
    }
  } catch (error: any) {
    console.error({ error })
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to save bank account')
  }
}

export const bankAccountServices = {
  getBankCodes,
  addBankAccount,
}
