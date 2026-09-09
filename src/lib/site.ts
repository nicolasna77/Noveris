// L'identité du site, en un seul endroit : elle alimente aussi bien les
// pages que le sitemap, les métadonnées de partage et le balisage
// structuré. Recopier ces valeurs les ferait diverger.

export const SITE_NAME = "Noveris";

export const SITE_DESCRIPTION =
  "Noveris installe des automatisations IA clé-en-main pour artisans, coachs, indépendants et TPE/PME : standard téléphonique, assistants de messagerie, documents administratifs. L'équipe installe, connecte et surveille — aucune compétence technique requise.";

/**
 * URL publique, sans slash final. Le slash a déjà cassé la validation de
 * signature Twilio une fois (voir src/lib/twilio.ts) ; ici il produirait des
 * URL canoniques en double slash.
 */
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

// Les questions que les prospects posent avant de se lancer. Partagées entre
// la section FAQ de l'accueil et le balisage FAQPage : un moteur — ou un
// agent — qui lit la page structurée doit y trouver exactement ce qu'un
// visiteur y lit.
export const FAQS = [
  {
    question: "Dois-je savoir configurer un outil ou une API ?",
    answer:
      "Non. Notre équipe installe, connecte et vérifie chaque automatisation à votre place. Vous n'ouvrez aucun logiciel technique.",
  },
  {
    question: "Combien de temps avant que ce soit actif ?",
    answer:
      "La plupart des solutions sont déployées et vérifiées en quelques jours après l'audit initial.",
  },
  {
    question: "Je peux arrêter quand je veux ?",
    answer:
      "Oui, aucun engagement de durée. Et vous êtes remboursé si vous n'êtes pas satisfait dans les 30 premiers jours.",
  },
  {
    question: "Et si j'ai déjà un agenda ou un outil de facturation ?",
    answer:
      "Nous connectons vos automatisations à vos outils existants plutôt que de vous en imposer de nouveaux.",
  },
  {
    question: "Mes données sont-elles en sécurité ?",
    answer:
      "Vos données restent liées à vos outils existants. Nous ne les revendons ni ne les partageons avec des tiers.",
  },
];
