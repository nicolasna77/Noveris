import Stripe from "stripe";

export const stripeClient = new Stripe(
  process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder",
  { apiVersion: "2026-08-26.dahlia" }
);
