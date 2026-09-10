"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { redirectAfterSignIn } from "../redirect-after-sign-in";

export function TwoFactorVerificationForm() {
  const router = useRouter();
  const codeId = useId();
  const trustId = useId();
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const trimmed = code.replace(/\s+/g, "");
    const { error } = useBackupCode
      ? await authClient.twoFactor.verifyBackupCode({ code: trimmed, trustDevice })
      : await authClient.twoFactor.verifyTotp({ code: trimmed, trustDevice });

    if (error) {
      setLoading(false);
      setError(
        error.status === 401 && error.code?.includes("COOKIE")
          ? "La vérification a expiré. Reconnectez-vous."
          : useBackupCode
            ? "Ce code de secours n'est pas valable."
            : "Code incorrect. Vérifiez que l'heure de votre téléphone est à jour, puis réessayez."
      );
      return;
    }

    await redirectAfterSignIn(router);
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Vérification en deux étapes</CardTitle>
        <CardDescription>
          {useBackupCode
            ? "Saisissez l'un des codes de secours obtenus à l'activation."
            : "Saisissez le code à 6 chiffres affiché dans votre application d'authentification."}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={codeId}>{useBackupCode ? "Code de secours" : "Code"}</Label>
            <Input
              id={codeId}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode={useBackupCode ? "text" : "numeric"}
              autoComplete="one-time-code"
              autoFocus
              required
              className="tabular-nums tracking-widest"
            />
          </div>
          <label htmlFor={trustId} className="flex items-center gap-2 text-sm">
            <Checkbox
              id={trustId}
              checked={trustDevice}
              onCheckedChange={(checked) => setTrustDevice(checked === true)}
            />
            Ne plus demander sur cet appareil pendant 30 jours
          </label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </CardContent>
        <CardFooter className="mt-6 flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading || !code.trim()}>
            {loading ? "Vérification…" : "Valider"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setUseBackupCode((prev) => !prev);
              setCode("");
              setError(null);
            }}
          >
            {useBackupCode ? "Utiliser mon application" : "Utiliser un code de secours"}
          </Button>
          <Link href="/login" className="text-sm text-muted-foreground underline underline-offset-4">
            Revenir à la connexion
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
