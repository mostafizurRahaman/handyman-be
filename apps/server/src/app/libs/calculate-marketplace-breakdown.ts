import { logger } from './logger'

interface IFeeBreakdown {
  agreedPrice: number
  platformFee: number
  gstOnPlatformFee: number
  providerReceives: number
  gatewayFee: number
  customerPays: number
}

export const calculateMarketplaceBreakdown = (agreedPrice: number): IFeeBreakdown => {
  // Convert input to Kobo to ensure integer math (Professional standard for finance)
  const agreedPriceKobo = Math.round(agreedPrice * 100)

  /** ----------- PAYSTACK CONSTANTS (NGN) ----------- */
  const PERCENTAGE_FEE = 0.015 // 1.5%
  const FLAT_FEE_KOBO = 10000 // ₦100
  const CAP_KOBO = 200000 // ₦2,000
  const THRESHOLD_KOBO = 250000 // ₦2,500 (Waiver threshold)

  /** ----------- PLATFORM FEES (Deducted from Provider) ----------- */
  const PLATFORM_FEE_RATE = 0.05 // 5%
  const GST_RATE = 0.075 // 7.5%

  const platformFeeKobo = Math.round(agreedPriceKobo * PLATFORM_FEE_RATE)
  const gstOnPlatformFeeKobo = Math.round(platformFeeKobo * GST_RATE)
  const providerReceivesKobo = agreedPriceKobo - platformFeeKobo - gstOnPlatformFeeKobo

  /** ----------- GATEWAY FEE (Passed to Customer) ----------- */
  let customerPaysKobo: number

  /**
   * PAYSTACK "PASS THE FEE" FORMULA:
   * To find the amount to charge the customer so you receive EXACTLY the agreedPrice:
   * Total = (TargetAmount + FixedFee) / (1 - PercentageFee)
   */

  // 1. Determine if the 100 Naira flat fee applies.
  // The threshold is 2500. Since we are passing the fee, we check if the
  // expected total will cross the 2500 mark.
  const baseCharge = agreedPriceKobo / (1 - PERCENTAGE_FEE)

  if (baseCharge < THRESHOLD_KOBO) {
    // Waiver applies (No ₦100)
    customerPaysKobo = Math.ceil(agreedPriceKobo / (1 - PERCENTAGE_FEE))
  } else {
    // Flat fee applies (Add ₦100)
    customerPaysKobo = Math.ceil((agreedPriceKobo + FLAT_FEE_KOBO) / (1 - PERCENTAGE_FEE))
  }

  // 2. Apply the ₦2,000 Cap
  let actualGatewayFeeKobo = customerPaysKobo - agreedPriceKobo

  if (actualGatewayFeeKobo > CAP_KOBO) {
    actualGatewayFeeKobo = CAP_KOBO
    customerPaysKobo = agreedPriceKobo + CAP_KOBO
  }

  /** ----------- FINAL BREAKDOWN (Convert back to Naira) ----------- */
  const result: IFeeBreakdown = {
    agreedPrice: Number((agreedPriceKobo / 100).toFixed(2)),
    platformFee: Number((platformFeeKobo / 100).toFixed(2)),
    gstOnPlatformFee: Number((gstOnPlatformFeeKobo / 100).toFixed(2)),
    providerReceives: Number((providerReceivesKobo / 100).toFixed(2)),
    gatewayFee: Number((actualGatewayFeeKobo / 100).toFixed(2)),
    customerPays: Number((customerPaysKobo / 100).toFixed(2)),
  }

  logger.info(`✅ Paystack Compliant Breakdown`, {
    ...result,
    amountForPaystackAPI: customerPaysKobo, // Send this integer to Paystack
  })

  return result
}
