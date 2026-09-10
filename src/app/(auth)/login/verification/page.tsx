import type { Metadata } from "next";
import { TwoFactorVerificationForm } from "./two-factor-verification-form";

export const metadata: Metadata = { title: "Vérification en deux étapes" };

export default function TwoFactorVerificationPage() {
  return <TwoFactorVerificationForm />;
}
