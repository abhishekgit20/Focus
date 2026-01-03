// Stripe webhook handlers for Focus platform
import Stripe from 'stripe';
import { getStripeSecretKey } from './stripeClient';

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
        apiVersion: '2024-12-18.acacia',
      });

      // Verify webhook signature
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
      );

      // Handle the event
      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object as Stripe.Checkout.Session;
          console.log('Checkout session completed:', session.id);
          // Handle successful payment - update wallet, etc.
          // This would need to be implemented based on your business logic
          break;
        
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          console.log('Payment intent succeeded:', paymentIntent.id);
          // Handle successful payment intent
          break;
        
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error: any) {
      console.error('Webhook signature verification failed:', error.message);
      throw new Error(`Webhook Error: ${error.message}`);
    }
  }
}