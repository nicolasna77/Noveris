"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { ProfileSection } from "./profile-section";

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

  // Le bouton ne s'allume que s'il y a réellement quelque chose à
  // enregistrer : sur une page où les notifications s'enregistrent toutes
  // seules, un bouton toujours actif laissait planer le doute sur ce qui
  // avait été pris en compte.
  const isDirty = name !== initialAccount.name || image !== initialAccount.image;

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
      toast.success("Profil enregistré.");
      router.refresh();
    });
  }

  return (
    <>
      {/* La personne ouvre sa propre page : son avatar et son nom sont les
          seuls éléments de grande taille, le reste de la page reste discret. */}
      <div className="flex flex-wrap items-center gap-5">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessingImage}
          aria-label="Changer la photo de profil"
          className="group relative size-20 shrink-0 overflow-hidden rounded-full border border-border bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
        >
          {image ? (
            // Data URL produite côté client (voir resizeImageToDataUrl) :
            // next/image ne sait pas l'optimiser, il faudrait la passer en
            // `unoptimized` pour aboutir au même <img>.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-xl font-medium text-muted-foreground">
              {initials || "?"}
            </span>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-foreground/60 text-background opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            {isProcessingImage ? (
              <Loader2 className="size-5 animate-spin" aria-hidden="true" />
            ) : (
              <Camera className="size-5" aria-hidden="true" />
            )}
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="min-w-0">
          {/* Le nom porte le <h1> : la page n'a pas de titre séparé, c'est
              lui qui l'ouvre. */}
          <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">
            {name || "Votre nom"}
          </h1>
          <p className="truncate text-sm text-muted-foreground">
            {initialAccount.email}
          </p>
          {image && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="mt-1 -ml-2"
              onClick={() => setImage("")}
            >
              Retirer la photo
            </Button>
          )}
        </div>
      </div>

      <div className="mt-8">
        <ProfileSection
          title="Vos informations"
          description="Le nom qui apparaît dans vos échanges avec l'équipe Noveris."
          action={
            <Button
              onClick={handleSave}
              disabled={!isDirty || isPending}
              aria-busy={isPending}
            >
              {isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          }
        >
          <div className="grid gap-4 sm:max-w-md">
            <div className="space-y-2">
              <Label htmlFor="name">Nom</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            {/* L'e-mail n'est pas modifiable : l'afficher comme un champ de
                saisie grisé donnait l'impression d'un formulaire cassé. */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">E-mail</p>
              <p className="text-sm text-muted-foreground">
                {initialAccount.email} — écrivez-nous depuis{" "}
                <a
                  href="/dashboard/aide"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  le centre d&apos;aide
                </a>{" "}
                pour en changer.
              </p>
            </div>
          </div>
        </ProfileSection>
      </div>
    </>
  );
}
