"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

export type InitialAccount = {
  name: string;
  email: string;
  image: string;
};

const MAX_AVATAR_FILE_SIZE = 5 * 1024 * 1024;
const AVATAR_DIMENSION = 256;

// Redimensionne l'image côté client et la renvoie en data URL — stockée
// directement dans le champ `image` de l'utilisateur (pas d'hébergement de
// fichiers configuré pour l'instant).
function resizeImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(
          1,
          AVATAR_DIMENSION / Math.max(img.width, img.height)
        );
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Traitement d'image indisponible"));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => reject(new Error("Image invalide"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Lecture du fichier impossible"));
    reader.readAsDataURL(file);
  });
}

export function AccountForm({ initialAccount }: { initialAccount: InitialAccount }) {
  const router = useRouter();
  const [name, setName] = useState(initialAccount.name);
  const [image, setImage] = useState(initialAccount.image);
  const [isPending, startTransition] = useTransition();
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Merci de choisir un fichier image.");
      return;
    }
    if (file.size > MAX_AVATAR_FILE_SIZE) {
      toast.error("L'image ne doit pas dépasser 5 Mo.");
      return;
    }

    setIsProcessingImage(true);
    try {
      setImage(await resizeImageToDataUrl(file));
    } catch {
      toast.error("Impossible de traiter cette image.");
    } finally {
      setIsProcessingImage(false);
    }
  }

  function handleSave() {
    startTransition(async () => {
      const { error } = await authClient.updateUser({
        name,
        image: image || null,
      });
      if (error) {
        toast.error(error.message ?? "Une erreur est survenue.");
        return;
      }
      toast.success("Compte mis à jour.");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compte</CardTitle>
        <CardDescription>
          Vos informations de connexion, gérées par Better Auth.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar size="lg">
            <AvatarImage src={image || undefined} alt={name} />
            <AvatarFallback>{initials || "?"}</AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <Label>Photo de profil</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isProcessingImage}
                onClick={() => fileInputRef.current?.click()}
              >
                {isProcessingImage ? "Traitement…" : "Changer la photo"}
              </Button>
              {image && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setImage("")}
                >
                  Retirer
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Nom</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" value={initialAccount.email} disabled />
          <p className="text-xs text-muted-foreground">
            Contactez-nous pour changer l&apos;adresse e-mail associée à votre
            compte.
          </p>
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <Button onClick={handleSave} disabled={isPending} aria-busy={isPending}>
          {isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </CardFooter>
    </Card>
  );
}
