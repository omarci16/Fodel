/** Policy switch for restoring the pre-1.3 pay-before-publish workflow.
 * Like STRIPE_ENABLED this is read at build time and needs a redeploy. */
export function paymentGatesPublishing(): boolean {
  return import.meta.env.PAYMENT_GATES_PUBLISHING === 'true';
}
