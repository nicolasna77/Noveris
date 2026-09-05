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
import { slugify } from "@/lib/utils";
import { GoogleSignInButton } from "../google-signin-button";

export function SignupForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name"));
    const company = String(formData.get("company") ?? "").trim();

    // Le rôle n'est jamais transmis : il est fixé côté serveur (CLIENT par
    // défaut) et ne peut pas être choisi à l'inscription.
    const { error } = await authClient.signUp.email({
      name,
      email: String(formData.get("email")),
      password: String(formData.get("password")),
    });

    if (error) {
      setError(
        error.status === 422
          ? "Un compte existe déjà avec cet e-mail."
          : (error.message ?? "Une erreur est survenue.")
      );
      setLoading(false);
      return;
    }

    // Une organisation par compte, créée avec le nom d'entreprise donné (ou
    // un nom par défaut) — devient automatiquement l'organisation active.
    // Best-effort : en cas d'échec, le tableau de bord s'auto-répare à la
    // première visite (voir getActiveOrganizationContext).
    const organizationName = company || `Organisation de ${name.split(" ")[0]}`;
    await authClient.organization.create({
      name: organizationName,
      slug: slugify(organizationName),
    });

    window.location.href = "/dashboard";
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
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
        <CardFooter className="mt-6 flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Création du compte…" : "Créer mon compte"}
          </Button>
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
