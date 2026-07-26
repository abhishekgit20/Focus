-- Wallet-recharge idempotency: Stripe/Razorpay can redeliver the same
-- payment confirmation more than once (webhook retries, dual events for one
-- checkout). The old idempotency check was a SELECT-then-INSERT with no
-- transaction or constraint tying them together, so two overlapping
-- deliveries of the same payment could both pass the check and double-credit
-- the wallet. These unique indexes make the wallet-transaction insert itself
-- the idempotency gate — a duplicate delivery hits a constraint violation
-- instead of silently succeeding twice. NULLs don't conflict with each
-- other, so non-Stripe/Razorpay transactions (refunds, promo credits, etc.)
-- are unaffected. Additive only — safe to re-run.

CREATE UNIQUE INDEX IF NOT EXISTS "UQ_wallet_transactions_stripe_payment_id" ON wallet_transactions(stripe_payment_id);
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_wallet_transactions_razorpay_payment_id" ON wallet_transactions(razorpay_payment_id);
