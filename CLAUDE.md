# Noveris

## Description du projet

Noveris vend des automatisations IA clé-en-main à des artisans, coachs,
indépendants et TPE/PME en France : standard téléphonique IA (agent vocal qui
répond aux appels), prise de rendez-vous automatique, réponses e-mail
automatisées, génération de documents administratifs, etc.

Trois espaces :
- Site public (`/`, `/prestations/[slug]`, `/contact`) — landing page et
  catalogue, vitrine commerciale de l'agence.
- Tableau de bord client (`/dashboard`, rôle `CLIENT`) — un client peut avoir
  plusieurs entreprises (organisations), activer une même prestation
  plusieurs fois (ex. deux boutiques), payer via Stripe, suivre le statut de
  chaque prestation et contacter l'équipe (`/dashboard/aide`).
- Espace admin (`/admin`, rôle `ADMIN`) — supervision de tous les clients,
  gestion du catalogue, centre d'aide.

## Stack technique

- **Next.js 16** (App Router, Turbopack, Server Components/Actions), React 19, TypeScript
- **Prisma 7** + **PostgreSQL** (adapter `@prisma/adapter-pg`)
- **better-auth 1.6.23** — email/mot de passe, plugin `admin` (rôles,
  bannissement, réinitialisation de mot de passe), plugin `organization`
  (une organisation = une entreprise du client), `@better-auth/stripe`
- **Stripe** — une Checkout Session par prestation (frais de mise en place
  ponctuels et/ou abonnement mensuel, indépendamment optionnels) ; le
  montant est toujours lu depuis la table `Service` côté serveur, jamais
  transmis par le client
- **Twilio** — achat de numéros de téléphone français, routage des appels entrants
- **OpenAI Realtime API (SIP)** — l'agent vocal IA qui décroche les appels des clients
- **Google Calendar (OAuth)** — connexion de l'agenda du client pour la prise de rendez-vous automatique
- **Tailwind CSS v4** + **shadcn** (style « base-luma ») sur des primitives
  **Base UI** (`@base-ui/react`) — pas Radix ; attention à `nativeButton` sur
  `Button`/`SheetClose` quand on les fait rendre un élément non-`<button>`
  (ex. `render={<Link .../>}`)
- lucide-react (icônes), sonner (toasts), next-themes (thème clair/sombre), recharts (graphiques)

## Architecture

- `src/app/(auth)` — connexion / inscription
- `src/app/admin` — espace équipe (rôle `ADMIN` vérifié dans le layout **et**
  dans chaque Server Action séparément, une action n'hérite pas de l'auth du layout)
- `src/app/dashboard` — espace client, toutes les données sont scopées par
  l'organisation active (`requireActiveOrganization`), jamais par le seul `userId`
- `src/app/api` — webhooks externes (Twilio, OpenAI, Stripe via better-auth,
  callback OAuth Google Calendar), tous avec vérification de signature/état,
  et routes consultées en polling par le dashboard client
- `src/lib` — logique métier partagée (catalogue, session, organisation,
  intégrations tierces, agent vocal)
- `src/components/ui` — primitives shadcn/Base UI ; `src/components` — composants applicatifs partagés

## Skills recommandées

Skills du plugin officiel (disponibles globalement dans Claude Code) :
- **frontend-design** — refonte visuelle UI/UX (site public, composants dashboard/admin)
- **feature-dev** — nouvelle fonctionnalité non triviale (recherche du code
  existant → questions de clarification → choix d'architecture → implémentation → revue)
- **code-review** (`/code-review ultra` ou l'alias `/ultrareview`) — revue
  multi-agent de la branche courante ou d'une PR GitHub
- **code-simplifier** — simplifier/refactorer du code existant sans changer son comportement
- **context7** — documentation à jour des librairies (Next.js, Prisma,
  better-auth, Stripe...) à préférer à la mémoire du modèle pour toute API récente
- **github** / **pr-review-toolkit** — travail lié aux PR/issues (nécessite un remote GitHub, absent du dépôt pour l'instant)
- **vercel** — déploiement et observabilité si l'app est hébergée sur Vercel

Skills installées spécifiquement pour ce projet (`.claude/skills/`, orientées
contenu/marketing du site public) : **landing-page-copywriter**,
**copywriting**, **copy-editing**, **ad-creative**, **ai-seo**,
**ab-testing**, **co-marketing** — pertinentes pour la page d'accueil,
`/contact`, les pages `/prestations/[slug]` et toute itération marketing.
