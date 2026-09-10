"use client";

import Link from "next/link";
import { useState } from "react";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";
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
import { GoogleSignInButton } from "../google-signin-button";

const AFTER_VERIFICATION_URL = "/dashboard";

export function SignupForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email"));
    const company = String(formData.get("company") ?? "").trim();

    const { error } = await authClient.signUp.email({
      name: String(formData.get("name")),
      email,
      password: String(formData.get("password")),
      pendingOrganizationName: company || undefined,
      callbackURL: AFTER_VERIFICATION_URL,
    });

    setLoading(false);
    if (error) {
      setError(
        error.status === 422
          ? "Un compte existe déjà avec cet e-mail."
          : "La création du compte a échoué. Vérifiez vos informations puis réessayez."
      );
      return;
    }
    setSentTo(email);
  }

  async function handleResend() {
    if (!sentTo) return;
    setResending(true);
    const { error } = await authClient.sendVerificationEmail({
      email: sentTo,
      callbackURL: AFTER_VERIFICATION_URL,
    });
    setResending(false);
    if (error) {
      toast.error("L'envoi a échoué. Réessayez dans quelques minutes.");
      return;
    }
    toast.success("Nouveau lien envoyé.");
  }

  if (sentTo) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <MailCheck className="size-6 text-primary" aria-hidden="true" />
          <CardTitle className="mt-2">Vérifiez votre boîte mail</CardTitle>
          <CardDescription>
            Nous avons envoyé un lien de confirmation à{" "}
            <span className="font-medium text-foreground">{sentTo}</span>.
            Cliquez dessus pour activer votre compte.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Rien reçu après quelques minutes ? Regardez dans les indésirables,
          ou demandez un nouveau lien.
        </CardContent>
        <CardFooter className="mt-2 flex flex-col gap-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleResend}
            disabled={resending}
            aria-busy={resending}
          >
            {resending ? "Envoi…" : "Renvoyer le lien"}
          </Button>
          <Link href="/login" className="text-sm text-muted-foreground underline underline-offset-4">
            Revenir à la connexion
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Créer un compte</CardTitle>
        <CardDescription>
          Activez vos premières automatisations en quelques minutes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <GoogleSignInButton />
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          ou
          <span className="h-px flex-1 bg-border" />
        </div>
      </CardContent>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom</Label>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              placeholder="Marie Dupont"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">
              Entreprise{" "}
              <span className="text-muted-foreground">(optionnel)</span>
            </Label>
            <Input
              id="company"
              name="company"
              autoComplete="organization"
              placeholder="Dupont Coiffure"
              maxLength={80}
            />
          </div>
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
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <p className="text-xs text-muted-foreground">
              8 caractères minimum.
            </p>
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </CardContent>
        <CardFooter className="mt-6 flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Création du compte…" : "Créer mon compte"}
          </Button>
          <p className="text-xs text-muted-foreground">
            En créant un compte, vous acceptez nos{" "}
            <Link href="/cgv" className="underline underline-offset-4 hover:text-foreground">
              conditions générales de vente
            </Link>{" "}
            et notre{" "}
            <Link href="/confidentialite" className="underline underline-offset-4 hover:text-foreground">
              politique de confidentialité
            </Link>
            .
          </p>
          <p className="text-sm text-muted-foreground">
            Déjà un compte ?{" "}
            <Link href="/login" className="text-foreground underline underline-offset-4">
              Se connecter
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
