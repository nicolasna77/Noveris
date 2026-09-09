// Le cadre commun aux images d'aperçu, partagé par l'accueil et les pages de
// solution — deux aperçus de la même marque doivent se ressembler.
//
// Satori (le moteur qui rend ces images) n'est pas un navigateur : il exige
// un `display` explicite sur tout élément à plusieurs enfants, ignore les
// classes CSS, et ne charge aucune police distante ici — un appel réseau à
// chaque partage échouerait silencieusement le jour où il tombe.

export const OG_SIZE = { width: 1200, height: 630 };

const INK = "#0d0b1e";
const PAPER = "#ffffff";
const MUTED = "#a9a4c7";
const BRAND = "#432dd7";

export function OgFrame({
  eyebrow,
  lines,
  subtitle,
  footer,
}: {
  eyebrow?: string;
  lines: string[];
  subtitle: string;
  footer: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: INK,
        color: PAPER,
        padding: 80,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: BRAND,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            fontWeight: 700,
          }}
        >
          N
        </div>
        <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.5 }}>Noveris</div>
        {eyebrow && (
          // Une seule chaîne, pas `· {eyebrow}` : Satori y verrait deux
          // enfants et exigerait un display explicite.
          <div style={{ fontSize: 26, color: MUTED, marginLeft: 8 }}>{`· ${eyebrow}`}</div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            // Un titre sur plusieurs lignes doit tenir sur ces lignes-là :
            // à 64px, la deuxième débordait et se cassait en trois.
            fontSize: lines.length > 1 ? 54 : 72,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: -1.5,
          }}
        >
          {lines.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
        <div style={{ fontSize: 30, color: MUTED, lineHeight: 1.4 }}>{subtitle}</div>
      </div>

      <div style={{ display: "flex", fontSize: 26, color: MUTED }}>{footer}</div>
    </div>
  );
}
