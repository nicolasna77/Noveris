import { createAuthClient } from "better-auth/react";
import { stripeClient } from "@better-auth/stripe/client";
import { inferAdditionalFields, organizationClient } from "better-auth/client/plugins";
import type { auth } from "@/lib/auth";

export const authClient = createAuthClient({
  // Pas de baseURL : better-auth vise alors l'origine de la page. Une URL
  // figée à la compilation envoyait les requêtes d'authentification vers
  // l'origine de production depuis toute autre origine — preview Vercel ou
  // serveur de test — où le navigateur les bloquait pour CORS, sans erreur
  // exploitable : la promesse ne se résolvait jamais et le formulaire
  // restait figé sur « Connexion… ».
  plugins: [
    inferAdditionalFields<typeof auth>(),
    stripeClient({ subscription: true }),
    organizationClient(),
  ],
});

export const {
  signIn,
  signOut,
  signUp,
  useSession,
  useListOrganizations,
  useActiveOrganization,
} = authClient;
