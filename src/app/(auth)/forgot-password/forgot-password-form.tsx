"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    await authClient.requestPasswordReset({
      email: String(formData.get("email")),
      redirectTo: "/reset-password",
    });

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Vérifiez votre boîte mail</CardTitle>
          <CardDescription>
            Si un compte existe avec cette adresse, un lien de
            réinitialisation vient de lui être envoyé.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link
            href="/login"
            className="text-sm text-foreground underline underline-offset-4"
          >
            Retour à la connexion
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Mot de passe oublié</CardTitle>
        <CardDescription>
          Indiquez votre e-mail, nous vous envoyons un lien pour en choisir un
          nouveau.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="vous@entreprise.fr"
              required
            />
          </div>
        </CardContent>
        <CardFooter className="mt-6 flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Envoi…" : "Envoyer le lien"}
          </Button>
          <Link
            href="/login"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Retour à la connexion
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
