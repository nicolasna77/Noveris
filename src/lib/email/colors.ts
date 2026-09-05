// Équivalents hex des tokens shadcn du site (src/app/globals.css, thème
// clair) — les e-mails ne peuvent pas lire les variables CSS ni oklch(), ces
// valeurs sont donc figées ici plutôt que réinventées. Ne pas ajouter de
// couleur qui n'existe pas déjà dans globals.css.
export const EMAIL_COLORS = {
  background: "#f4f4f5", // --muted
  card: "#ffffff", // --card
  foreground: "#09090b", // --foreground
  mutedForeground: "#71717b", // --muted-foreground
  border: "#e4e4e7", // --border
  primary: "#432dd7", // --primary
  primaryForeground: "#eef2ff", // --primary-foreground
} as const;
