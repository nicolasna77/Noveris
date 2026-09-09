// Le risque numéro un d'un agent qui écrit du marketing n'est pas d'écrire
// mal : c'est d'inventer des preuves. « +40 % de rendez-vous », « plus de 200
// artisans nous font confiance », un témoignage attribué à un client qui
// n'existe pas — ces phrases sont plausibles, bien tournées, et fausses.
// Publiées au nom de Noveris, elles sont indéfendables.
//
// Le prompt l'interdit déjà. Ceci est la seconde barrière, pour le jour où le
// modèle passe outre : on ne bloque pas, on signale à l'humain qui valide.
// Un avertissement de trop lui coûte trois secondes ; une affirmation
// inventée publiée lui coûte bien davantage.

type ClaimRule = {
  pattern: RegExp;
  message: string;
};

const RULES: ClaimRule[] = [
  {
    // Aucun pourcentage n'est vérifiable aujourd'hui : Noveris ne publie
    // aucune mesure de résultat.
    pattern: /\d+(?:[.,]\d+)?\s*%/,
    message: "contient un pourcentage — aucun chiffre de résultat n'est mesuré à ce jour",
  },
  {
    // Le nombre est aussi souvent écrit en toutes lettres qu'en chiffres —
    // un modèle rédigeant en français préfère « trois fois plus ».
    pattern:
      /\b(?:\d+(?:[.,]\d+)?|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|vingt|cent|mille)\s*fois\s+(?:plus|moins|mieux)\b/i,
    message: "annonce un facteur de progression invérifiable",
  },
  {
    // « plus de 200 artisans », « 150 entreprises nous font confiance »…
    pattern:
      /\b\d+\s*(?:\+\s*)?(?:clients?|entreprises?|artisans?|utilisateurs?|professionnels?|abonnés?)\b/i,
    message: "avance un nombre de clients qui n'est pas vérifiable",
  },
  {
    // Une citation attribuée : « … » suivi d'un tiret et d'un nom propre.
    // Les guillemets seuls ne suffisent pas — un texte bien écrit cite une
    // pensée du lecteur (« il faut que je réponde vite »), ce qui n'affirme
    // rien et ne doit pas déclencher d'alerte.
    pattern: /[»"”]\s*[—–-]\s*[A-ZÀ-Ý]/,
    message: "cite une personne nommée — aucun témoignage n'a été recueilli",
  },
  {
    // Ou une citation assez longue pour ne plus être une figure de style.
    pattern: /[«"“][^»"”]{120,}[»"”]/,
    message: "contient une longue citation — vérifiez qu'elle n'est attribuée à personne",
  },
  {
    pattern: /\b(?:n°\s*1|numéro\s+un|leader\s+(?:du|de|français)|le\s+meilleur\b)/i,
    message: "revendique une position de marché non établie",
  },
  {
    pattern: /\b(?:certifié|agréé|primé|récompensé)\b/i,
    message: "évoque une certification ou une récompense — aucune n'existe",
  },
];

/**
 * Renvoie les avertissements soulevés par un texte. Purement consultatif :
 * c'est l'humain qui tranche à la validation.
 */
export function detectUnsupportedClaims(body: string): string[] {
  return RULES.filter((rule) => rule.pattern.test(body)).map((rule) => rule.message);
}
