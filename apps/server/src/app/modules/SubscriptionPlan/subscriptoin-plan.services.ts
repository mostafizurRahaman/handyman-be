import configs from '@app/configs'
import type {
  TCreateSubscriptonPlanType,
  TSubscriptionQuerySchema,
} from './subscriptoin-plan.validations'
import axios from 'axios'
import { AppError, QueryBuilder } from 'packages/shared/src'
import httpStatus from 'http-status'
import { SubscriptionPlan } from 'packages/db/src'
import { logger } from '@app/libs/logger'

// 1. Create a plan:
const createPlan = async (payload: TCreateSubscriptonPlanType) => {
  try {
    const { data } = await axios.post(
      `https://api.paystack.co/plan`,
      { ...payload, amount: payload.amount * 100, currency: 'NGN' },
      {
        headers: {
          Authorization: `Bearer ${configs.payStackConfig.secretKey}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!data.status) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Paystack plan creation failed!')
    }

    //  Prepare plan to save db:
    const plan = {
      name: data.data.name,
      amount: data.data.amount / 100,
      interval: data.data.interval,
      payStackPlanCode: data.data.plan_code,
      currency: 'NGN',
    }

    const insertedPlan = await SubscriptionPlan.create(plan)

    return insertedPlan
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      logger.error('Axios error', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      })

      throw new AppError(
        httpStatus.BAD_REQUEST,
        error.response?.data?.message || 'Payment gateway error'
      )
    }

    logger.error('Unknown error', { message: error.message })
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Internal server error')
  }
}

// 2. Get all plan:
const getAllPlan = async (query: TSubscriptionQuerySchema) => {
  const searableFields = ['name']

  const planQuery = new QueryBuilder(SubscriptionPlan.find({}), query)
    .search(searableFields)
    .filter()
    .sort()
    .paginate()
    .fields()

  const data = await planQuery.modelQuery
  const meta = await planQuery.countTotal()

  return {
    data,
    meta,
  }
}

// 3. Web hook:
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const Webhook = async (body: any) => {
  const { event, data } = body

  switch (event) {
    case 'charge.success':
        
      break
    default:
      console.log(`Unhandled Events: `, event)
  }

  // {
  //     "service": "trusted-handyman-ng",
  //     "event": "charge.success",
  //     "data": {
  //       "id": 5814870193,
  //       "domain": "test",
  //       "status": "success",
  //       "reference": "rrnzdnvert",
  //       "amount": 10000,
  //       "message": null,
  //       "gateway_response": "Successful",
  //       "paid_at": "2026-02-07T06:35:16.000Z",
  //       "created_at": "2026-02-07T06:34:44.000Z",
  //       "channel": "card",
  //       "currency": "NGN",
  //       "ip_address": "103.159.73.161",
  //       "metadata": {
  //         "user": "6984b472deffd17cc3e38765",
  //         "plan": "6986d6e3b0ad840795760969"
  //       },
  //       "fees_breakdown": null,
  //       "log": null,
  //       "fees": 150,
  //       "fees_split": null,
  //       "authorization": {
  //         "authorization_code": "AUTH_kp8v3g9r43",
  //         "bin": "408408",
  //         "last4": "4081",
  //         "exp_month": "12",
  //         "exp_year": "2030",
  //         "channel": "card",
  //         "card_type": "visa ",
  //         "bank": "TEST BANK",
  //         "country_code": "NG",
  //         "brand": "visa",
  //         "reusable": true,
  //         "signature": "SIG_bixuyOuo611R9LbQDxc1",
  //         "account_name": null,
  //         "receiver_bank_account_number": null,
  //         "receiver_bank": null
  //       },
  //       "customer": {
  //         "id": 337781807,
  //         "first_name": null,
  //         "last_name": null,
  //         "email": "fahim654326@gmail.com",
  //         "customer_code": "CUS_gg6g2j808yobr81",
  //         "phone": null,
  //         "metadata": null,
  //         "risk_action": "default",
  //         "international_format_phone": null
  //       },
  //       "plan": {
  //         "id": 3496908,
  //         "name": "ELITE",
  //         "plan_code": "PLN_zab7by29v0261jy",
  //         "description": null,
  //         "amount": 10000,
  //         "interval": "monthly",
  //         "send_invoices": 1,
  //         "send_sms": 1,
  //         "currency": "NGN"
  //       },
  //       "subaccount": {},
  //       "split": {},
  //       "order_id": null,
  //       "paidAt": "2026-02-07T06:35:16.000Z",
  //       "requested_amount": 10000,
  //       "pos_transaction_data": null,
  //       "source": {
  //         "type": "api",
  //         "source": "merchant_api",
  //         "entry_point": "transaction_initialize",
  //         "identifier": null
  //       }
  //     }
  //   }
}
export const subscriptonPlanService = {
  createPlan,
  getAllPlan,
}
