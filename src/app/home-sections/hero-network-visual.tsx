// Illustration du hero : votre entreprise au centre, connectée aux
// automatisations réellement vendues par Noveris. Purement décoratif —
// `aria-hidden`, le contenu utile est déjà dans le titre/paragraphe du hero
// — donc entièrement en SVG/CSS, sans JS (pas de "use client").
//
// Les noms viennent du catalogue (voir HeroSection) et non d'une liste
// écrite ici : la version précédente affichait encore « Assistant Messenger
// / Instagram » des mois après que cette prestation ait été scindée en deux.

// Ordre de remplissage, pas de lecture : les quatre coins d'abord, puis les
// deux flancs. Un catalogue de cinq prestations remplit ainsi les coins et
// un seul flanc, plutôt que de laisser un coin vide.
const SLOTS = [
  { id: "top-left", cx: 155, cy: 70, side: "top" },
  { id: "top-right", cx: 465, cy: 70, side: "top" },
  { id: "bottom-left", cx: 155, cy: 460, side: "bottom" },
  { id: "bottom-right", cx: 465, cy: 460, side: "bottom" },
  { id: "mid-left", cx: 115, cy: 265, side: "left" },
  { id: "mid-right", cx: 505, cy: 265, side: "right" },
] as const;

// Écart laissé entre une pastille de flanc et le nœud central. Ces deux-là
// sont ancrées par leur bord intérieur et non par leur centre : à centre
// fixe, un nom un peu long viendrait toucher le nœud central.
const SIDE_GAP = 26;

const FONT_SIZE = 12.5;
// Largeur moyenne d'un caractère à cette taille et cette graisse — sert à
// dimensionner la pastille d'après son texte, faute de pouvoir mesurer le
// rendu côté serveur. Volontairement majorée : une pastille un peu large ne
// se voit pas, un texte qui déborde de son cadre se voit tout de suite.
const CHAR_WIDTH = 7.3;
const BADGE_PADDING = 36;
const LINE_HEIGHT = 14;
const MAX_LINE_CHARS = 24;

// Coupe un nom trop long en deux lignes, sur un espace — « Prise de
// rendez-vous / commande par téléphone » ne tient pas sur une ligne dans une
// pastille de cette taille.
function wrapLabel(label: string): string[] {
  if (label.length <= MAX_LINE_CHARS) return [label];
  const words = label.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > MAX_LINE_CHARS && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  // Au-delà de deux lignes, la pastille déborderait sur les connecteurs :
  // le reste est tronqué plutôt que d'écraser la mise en page.
  return lines.slice(0, 2);
}

function toNode(label: string, slot: (typeof SLOTS)[number]) {
  const lines = wrapLabel(label);
  const longest = Math.max(...lines.map((line) => line.length));
  const w = Math.round(longest * CHAR_WIDTH) + BADGE_PADDING;

  // Les flancs s'écartent du centre à mesure qu'ils s'élargissent ; les
  // coins gardent leur position, ils ont la place.
  const cx =
    slot.side === "left"
      ? CENTER.cx - CENTER.w / 2 - SIDE_GAP - w / 2
      : slot.side === "right"
        ? CENTER.cx + CENTER.w / 2 + SIDE_GAP + w / 2
        : slot.cx;

  return {
    id: slot.id,
    side: slot.side,
    lines,
    cx,
    cy: slot.cy,
    w,
    h: lines.length > 1 ? 48 : 34,
  };
}

const CENTER = { cx: 310, cy: 265, w: 176, h: 40 };

// Tracés en équerre reliant chaque pastille au centre — le même `d` sert au
// trait visible et au segment lumineux qui le parcourt (stroke-dashoffset
// animé).
// Le trait part du bord de la pastille, calculé d'après sa hauteur réelle :
// celle-ci dépend du texte (une ou deux lignes), un tracé écrit en dur
// laisserait un trait flottant ou masqué selon le nom de la prestation.
// Le palier horizontal est décalé d'un côté à l'autre pour que les quatre
// tracés ne se superposent pas en arrivant au centre.
// Hauteur du palier horizontal des tracés en équerre, décalée d'un côté à
// l'autre pour que les quatre tracés ne se superposent pas en arrivant au
// centre. Les flancs rejoignent le centre à l'horizontale, sans équerre.
const ELBOW_Y: Record<"top-left" | "top-right" | "bottom-left" | "bottom-right", number> = {
  "top-left": 150,
  "top-right": 160,
  "bottom-left": 380,
  "bottom-right": 370,
};

function connectorPath(node: Node): string {
  if (node.side === "left" || node.side === "right") {
    const fromX =
      node.side === "left" ? node.cx + node.w / 2 : node.cx - node.w / 2;
    const toX =
      node.side === "left" ? CENTER.cx - CENTER.w / 2 : CENTER.cx + CENTER.w / 2;
    return `M${fromX},${node.cy} L${toX},${node.cy}`;
  }

  const elbowY = ELBOW_Y[node.id as keyof typeof ELBOW_Y];
  const fromY =
    node.side === "top" ? node.cy + node.h / 2 : node.cy - node.h / 2;
  const toY = node.side === "top" ? CENTER.cy - 20 : CENTER.cy + 20;
  return `M${node.cx},${fromY} L${node.cx},${elbowY} L${CENTER.cx},${elbowY} L${CENTER.cx},${toY}`;
}

// Vitesses volontairement différentes d'un connecteur à l'autre : synchrones,
// les quatre points lumineux se lisaient comme un seul clignotement.
const DURATIONS: Record<SlotId, number> = {
  "top-left": 2.4,
  "top-right": 3,
  "bottom-left": 2.8,
  "bottom-right": 3.4,
  "mid-left": 2.2,
  "mid-right": 3.2,
};

type SlotId = (typeof SLOTS)[number]["id"];
type Node = ReturnType<typeof toNode>;

function NodeBadge({ node }: { node: Node }) {
  const startY = node.cy - ((node.lines.length - 1) * LINE_HEIGHT) / 2 + 1;
  return (
    <g>
      <rect
        x={node.cx - node.w / 2}
        y={node.cy - node.h / 2}
        width={node.w}
        height={node.h}
        rx={8}
        fill="var(--card)"
        stroke="var(--border)"
      />
      <text
        x={node.cx}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={FONT_SIZE}
        fontWeight={600}
        fill="var(--card-foreground)"
      >
        {node.lines.map((line, i) => (
          <tspan key={line} x={node.cx} y={startY + i * LINE_HEIGHT}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

export function HeroNetworkVisual({ labels }: { labels: string[] }) {
  // Moins de quatre prestations au catalogue : on ne dessine que les
  // emplacements réellement remplis plutôt que des pastilles vides.
  const nodes = SLOTS.slice(0, labels.length).map((slot, i) =>
    toNode(labels[i], slot)
  );

  return (
    <div aria-hidden="true" className="relative w-full">
      <svg viewBox="0 0 620 560" className="relative h-auto w-full" role="img">
        <style>{`
          @media (prefers-reduced-motion: reduce) {
            .hero-net-flow { display: none; }
          }
          @media (prefers-reduced-motion: no-preference) {
            .hero-net-pulse { animation: hero-net-pulse 3s ease-in-out infinite; transform-origin: 310px 265px; }
          }
          @keyframes hero-net-pulse {
            0%, 100% { opacity: 0.35; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(1.08); }
          }
        `}</style>

        <defs>
          <radialGradient id="hero-net-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </radialGradient>
          <filter
            id="hero-net-blur"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
        </defs>

        {/* Halo derrière le nœud central */}
        <circle
          cx={CENTER.cx}
          cy={CENTER.cy}
          r={90}
          fill="url(#hero-net-glow)"
          className="hero-net-pulse"
        />

        {/* Connecteurs + segment lumineux qui défile vers le centre */}
        {nodes.map((node) => (
          <g key={node.id}>
            <path
              d={connectorPath(node)}
              fill="none"
              stroke="var(--primary)"
              strokeOpacity={0.35}
              strokeWidth={1.5}
            />
            <path
              d={connectorPath(node)}
              pathLength={100}
              fill="none"
              stroke="var(--primary)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeDasharray="15 85"
              filter="url(#hero-net-blur)"
              className="hero-net-flow"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="0"
                to="-100"
                dur={`${DURATIONS[node.id]}s`}
                begin={`${DURATIONS[node.id] / 3}s`}
                repeatCount="indefinite"
              />
            </path>
          </g>
        ))}

        {/* Pastilles */}
        {nodes.map((node) => (
          <NodeBadge key={node.id} node={node} />
        ))}

        {/* Nœud central */}
        <g>
          <rect
            x={CENTER.cx - CENTER.w / 2}
            y={CENTER.cy - CENTER.h / 2}
            width={CENTER.w}
            height={CENTER.h}
            rx={10}
            fill="var(--card)"
            stroke="var(--primary)"
            strokeOpacity={0.6}
          />
          <circle
            cx={CENTER.cx - CENTER.w / 2 + 24}
            cy={CENTER.cy}
            r={4}
            fill="var(--primary)"
          />
          <text
            x={CENTER.cx - CENTER.w / 2 + 38}
            y={CENTER.cy + 1}
            textAnchor="start"
            dominantBaseline="central"
            fontSize={14}
            fontWeight={700}
            fill="var(--card-foreground)"
          >
            Votre entreprise
          </text>
        </g>
      </svg>
    </div>
  );
}
