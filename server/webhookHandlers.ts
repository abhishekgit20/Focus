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
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          
          // Idempotency check - prevent double processing
          const existingTransaction = await storage.getStripePaymentBySessionId(session.id);
          if (existingTransaction) {
            console.log(`Stripe session ${session.id} already processed, skipping`);
            return; // Already processed, safe to ignore
          }

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

          // Check if payment was already processed by payment intent
          const existingByPaymentId = await storage.getStripePaymentByPaymentId(paymentIntentId);
          if (existingByPaymentId) {
            console.log(`Stripe payment ${paymentIntentId} already processed, skipping`);
            return;
          }

          // Get or create wallet
          let wallet = await storage.getWallet(userId);
          if (!wallet) {
            wallet = await storage.createWallet({ userId, balance: "0", totalRecharged: "0" });
          }

          // Credit wallet
          const rechargeAmount = parseFloat(amount);
          const newBalance = (parseFloat(wallet.balance) + rechargeAmount).toFixed(2);
          await storage.updateWalletBalance(wallet.id, newBalance);

          // Record transaction
          await storage.addWalletTransaction({
            walletId: wallet.id,
            type: "recharge",
            amount: amount,
            description: `Stripe wallet recharge of ₹${amount} (Session: ${session.id})`,
            stripePaymentId: paymentIntentId,
          });

          console.log(`Successfully processed Stripe payment: ${paymentIntentId} for user ${userId}, amount ₹${amount}`);
          break;
        }
        
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          
          // Idempotency check
          const existingTransaction = await storage.getStripePaymentByPaymentId(paymentIntent.id);
          if (existingTransaction) {
            console.log(`Stripe payment intent ${paymentIntent.id} already processed, skipping`);
            return;
          }

          // This is a fallback - checkout.session.completed is the primary handler
          // But we process this too for safety
          if (paymentIntent.metadata?.userId && paymentIntent.metadata?.amount) {
            const userId = paymentIntent.metadata.userId;
            const amount = paymentIntent.metadata.amount;

            let wallet = await storage.getWallet(userId);
            if (!wallet) {
              wallet = await storage.createWallet({ userId, balance: "0", totalRecharged: "0" });
            }

            const rechargeAmount = parseFloat(amount);
            const newBalance = (parseFloat(wallet.balance) + rechargeAmount).toFixed(2);
            await storage.updateWalletBalance(wallet.id, newBalance);

            await storage.addWalletTransaction({
              walletId: wallet.id,
              type: "recharge",
              amount: amount,
              description: `Stripe wallet recharge of ₹${amount} (Payment Intent: ${paymentIntent.id})`,
              stripePaymentId: paymentIntent.id,
            });

            console.log(`Successfully processed Stripe payment intent: ${paymentIntent.id} for user ${userId}`);
          }
          break;
        }
        
        default:
          console.log(`Unhandled Stripe event type: ${event.type}`);
      }
    } catch (error: any) {
      console.error('Webhook signature verification failed:', error.message);
      throw new Error(`Webhook Error: ${error.message}`);
    }
  }
}