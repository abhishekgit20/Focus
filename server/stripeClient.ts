// Stripe client integration for Focus platform
import Stripe from 'stripe';

let stripeClient: Stripe | null = null;
let stripePublishableKey: string | null = null;

export async function getStripeClient(): Promise<Stripe> {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    
    stripeClient = new Stripe(secretKey, {
      apiVersion: '2025-11-17.clover',
    });
  }
  return stripeClient;
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  // For routes that need fresh Stripe instance
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is required');
  }
  
  return new Stripe(secretKey, {
    apiVersion: '2025-11-17.clover',
  });
}

export async function getStripePublishableKey(): Promise<string> {
  if (!stripePublishableKey) {
    stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY || '';
    if (!stripePublishableKey) {
      throw new Error('STRIPE_PUBLISHABLE_KEY environment variable is required');
    }
  }
  return stripePublishableKey;
}

export async function getStripeSecretKey(): Promise<string> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is required');
  }
  return secretKey;
}