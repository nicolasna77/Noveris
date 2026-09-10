import type { MarketingChannel } from "@prisma/client";

export type ChannelRule = {
  label: string;
  audience: string;
  maxChars: number;
  targetChars: number;
  needsImage: boolean;
  guidance: string[];
};

export const CHANNEL_RULES: Record<MarketingChannel, ChannelRule> = {
  LINKEDIN: {
    label: "LinkedIn",
    audience:
      "des dirigeants de TPE/PME, des indépendants et des coachs, qui lisent entre deux rendez-vous",
    maxChars: 3000,
    targetChars: 1300,
    needsImage: false,
    guidance: [
      "Seules les deux premières lignes s'affichent avant « voir plus » : elles doivent donner envie de déplier, sans être une accroche publicitaire.",
      "Des paragraphes courts, séparés par une ligne vide.",
      "Trois hashtags au maximum, en fin de texte, ou aucun.",
      "Pas d'emoji en début de ligne comme puce de liste.",
    ],
  },
  FACEBOOK: {
    label: "Facebook",
    audience:
      "des artisans et des commerçants, souvent sur mobile, entre deux chantiers",
    maxChars: 63206,
    targetChars: 500,
    needsImage: false,
    guidance: [
      "Court et concret. Une situation reconnaissable, ce qu'on y change, et c'est tout.",
      "Le ton d'une personne qui parle, pas d'une marque qui communique.",
      "Pas de hashtag : ils n'y servent à rien.",
    ],
  },
  INSTAGRAM: {
    label: "Instagram",
    audience: "un public large, qui fait défiler et s'arrête sur une image",
    maxChars: 2200,
    targetChars: 600,
    needsImage: true,
    guidance: [
      "L'image porte le message, la légende l'accompagne : première phrase autonome, le reste peut être coupé.",
      "Cinq hashtags au maximum, en fin de légende.",
      "Décris le visuel attendu séparément, dans imageBrief : une scène concrète, pas une abstraction.",
    ],
  },
};

export function channelRule(channel: MarketingChannel): ChannelRule {
  return CHANNEL_RULES[channel];
}

export function exceedsChannelLimit(channel: MarketingChannel, body: string): boolean {
  return body.length > CHANNEL_RULES[channel].maxChars;
}
