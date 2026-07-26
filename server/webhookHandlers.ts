// Stripe webhook handlers for Focus platform
import Stripe from 'stripe';
import { getStripeSecretKey } from './stripeClient';
import { storage } from './storage';

export class WebhookHandlers {
  static async processWebhook(
    payload: Buffer,
    signature: string,
    webhookSecret: string
  ): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    try {
      const stripe = new Stripe(await getStripeSecretKey(), {
        apiVersion: '2025-11-17.clover',
      });

      // Verify webhook signature
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
      );

      // Durable, event-ID-keyed idempotency check — a cheaper, outermost
      // guard than the payment-ID-level checks deeper in
      // storage.creditWalletForGatewayPayment/recordCapture, and what gives
      // every inbound webhook a queryable row even before we know whether
      // processing it will succeed.
      const logged = await storage.recordWebhookEventIfNew({
        gateway: 'stripe',
        eventId: event.id,
        eventType: event.type,
        payload: event as unknown as Record<string, unknown>,
        status: 'received',
      });
      if (!logged) {
        console.log(`Stripe event ${event.id} already logged, skipping (gateway redelivery)`);
        return;
      }

      try {
        await WebhookHandlers.handleEvent(event);
        await storage.markWebhookEventProcessed(logged.id);
      } catch (processingError: any) {
        await storage.markWebhookEventFailed(logged.id, processingError.message);
        throw processingError;
      }
    } catch (error: any) {
      console.error('Webhook signature verification failed:', error.message);
      throw new Error(`Webhook Error: ${error.message}`);
    }
  }

  private static async handleEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Only process successful payments
        if (session.payment_status !== 'paid') {
          console.log(`Stripe session ${session.id} payment status: ${session.payment_status}, skipping`);
          return;
        }

        // Extract metadata
        const userId = session.metadata?.userId;
        const amount = session.metadata?.amount;
        const paymentIntentId = typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id;

        if (!userId || !amount || !paymentIntentId) {
          console.error(`Missing required metadata in Stripe session ${session.id}`);
          throw new Error('Missing required payment metadata');
        }

        // Idempotent credit — the UQ_wallet_transactions_stripe_payment_id
        // constraint (keyed on paymentIntentId) is what actually prevents a
        // double credit if Stripe redelivers this event or also fires
        // payment_intent.succeeded for the same payment; this isn't just a
        // pre-check, see storage.creditWalletForGatewayPayment.
        const result = await storage.creditWalletForGatewayPayment({
          userId,
          amount,
          description: `Stripe wallet recharge of ₹${amount} (Session: ${session.id})`,
          stripePaymentId: paymentIntentId,
        });

        if (!result.credited) {
          console.log(`Stripe payment ${paymentIntentId} already processed, skipping`);
          return;
        }

        console.log(`Successfully processed Stripe payment: ${paymentIntentId} for user ${userId}, amount ₹${amount}`);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        // This is a fallback — checkout.session.completed is the primary
        // handler. Currently a no-op in practice: Checkout Session metadata
        // isn't propagated onto the PaymentIntent unless payment_intent_data.metadata
        // is set at session-creation time, which this app doesn't do. Kept
        // (and still routed through the same idempotent credit path) in case
        // that ever changes or a future payment flow sets it directly.
        if (paymentIntent.metadata?.userId && paymentIntent.metadata?.amount) {
          const userId = paymentIntent.metadata.userId;
          const amount = paymentIntent.metadata.amount;

          const result = await storage.creditWalletForGatewayPayment({
            userId,
            amount,
            description: `Stripe wallet recharge of ₹${amount} (Payment Intent: ${paymentIntent.id})`,
            stripePaymentId: paymentIntent.id,
          });

          if (!result.credited) {
            console.log(`Stripe payment intent ${paymentIntent.id} already processed, skipping`);
            return;
          }

          console.log(`Successfully processed Stripe payment intent: ${paymentIntent.id} for user ${userId}`);
        }
        break;
      }

      case 'charge.dispute.created':
      case 'charge.dispute.updated': {
        await WebhookHandlers.handleStripeDispute(event.data.object as Stripe.Dispute, event.type);
        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }
  }

  // Chargebacks must never be silently dropped — this doesn't need to be
  // automated end-to-end yet (no auto-refund, no auto-suspend), but the
  // affected booking needs to be flagged and a human needs to find out.
  private static async handleStripeDispute(dispute: Stripe.Dispute, eventType: string): Promise<void> {
    const paymentIntentId = typeof dispute.payment_intent === 'string' ? dispute.payment_intent : dispute.payment_intent?.id;
    console.error(`Stripe dispute ${eventType} for payment_intent ${paymentIntentId}: ${dispute.reason}, amount ${dispute.amount}`);
    const { flagDispute } = await import('./booking/disputes');
    await flagDispute({
      gateway: 'stripe',
      gatewayDisputeId: dispute.id,
      gatewayPaymentId: paymentIntentId ?? null,
      reason: dispute.reason,
      amount: (dispute.amount / 100).toFixed(2),
      status: dispute.status,
      raw: dispute as unknown as Record<string, unknown>,
    });
  }
}
