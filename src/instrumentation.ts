// Point d'entrée exécuté une fois au démarrage de chaque instance du serveur,
// avant qu'une requête soit servie. C'est le seul endroit d'où une
// configuration incomplète peut être signalée tôt, et une seule fois, plutôt
// qu'à la première requête qui touche la variable en cause.
export async function register() {
  // register() est aussi appelée pour le runtime edge, où process.env ne
  // contient pas les variables serveur : la vérification n'y aurait aucun sens.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Import dynamique : ce module ne doit pas être chargé dans le bundle edge.
  const { checkEnvAtBoot } = await import("@/lib/env");
  checkEnvAtBoot();
}
