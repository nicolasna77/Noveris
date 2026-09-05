"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

// `resolvedTheme` n'est fiable qu'après le montage côté client (next-themes
// ne connaît pas encore la préférence système/localStorage pendant le rendu
// serveur) — on affiche une icône neutre et un bouton désactivé jusque-là
// plutôt que de risquer un mismatch d'hydratation. C'est l'exception
// documentée à "pas de setState dans un effet" : le seul moyen de détecter
// de façon fiable que l'hydratation est terminée.
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      aria-label={isDark ? "Activer le thème clair" : "Activer le thème sombre"}
      disabled={!mounted}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </Button>
  );
}
