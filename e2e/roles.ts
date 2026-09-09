// Comptes de démonstration créés par prisma/seed.ts, et les fichiers où
// leur session est mise de côté par auth.setup.ts.
export const CLIENT = { email: "marc.lefevre@example.com", password: "password123" };
export const ADMIN = { email: "equipe@noveris.test", password: "password123" };

export const CLIENT_STATE = "e2e/.auth/client.json";
export const ADMIN_STATE = "e2e/.auth/admin.json";

// Pour les parcours qui doivent partir d'un visiteur non connecté — sans
// quoi ils hériteraient de la session du projet.
export const ANONYMOUS = { cookies: [], origins: [] };
