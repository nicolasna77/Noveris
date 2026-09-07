// Illustration du hero : votre entreprise au centre, connectée aux
// automatisations réellement vendues par Noveris. Purement décoratif —
// `aria-hidden`, le contenu utile est déjà dans le titre/paragraphe du hero
// — donc entièrement en SVG/CSS, sans JS (pas de "use client").
const NODES = [
  {
    id: "standard",
    lines: ["Standard téléphonique automatisé"],
    cx: 155,
    cy: 70,
    w: 295,
    h: 34,
  },
  {
    id: "messenger",
    lines: ["Assistant Messenger / Instagram"],
    cx: 465,
    cy: 70,
    w: 285,
    h: 34,
  },
  {
    id: "rdv",
    lines: ["Prise de rendez-vous /", "commande par téléphone"],
    cx: 155,
    cy: 460,
    w: 270,
    h: 48,
  },
  {
    id: "whatsapp",
    lines: ["Assistant WhatsApp"],
    cx: 465,
    cy: 460,
    w: 200,
    h: 48,
  },
] as const;

const CENTER = { cx: 310, cy: 265, w: 176, h: 40 };

// Tracés en équerre reliant chaque pastille au centre — un seul et même `d`
// sert à la fois au trait visible et au point lumineux qui voyage dessus
// (`animateMotion path=...`).
const CONNECTORS: Record<(typeof NODES)[number]["id"], string> = {
  standard: "M155,87 L155,150 L310,150 L310,245",
  messenger: "M465,87 L465,160 L310,160 L310,245",
  rdv: "M155,436 L155,380 L310,380 L310,285",
  whatsapp: "M465,436 L465,370 L310,370 L310,285",
};

const DURATIONS: Record<(typeof NODES)[number]["id"], number> = {
  standard: 2.4,
  messenger: 3,
  rdv: 2.8,
  whatsapp: 3.4,
};

function NodeBadge({ node }: { node: (typeof NODES)[number] }) {
  const lineHeight = 14;
  const startY = node.cy - ((node.lines.length - 1) * lineHeight) / 2 + 1;
  return (
    <g>
      <rect
        x={node.cx - node.w / 2}
        y={node.cy - node.h / 2}
        width={node.w}
        height={node.h}
        rx={8}
        fill="#16151f"
        stroke="#2e2c3d"
      />
      <text
        x={node.cx}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12.5}
        fontWeight={600}
        fill="#e4e2f1"
      >
        {node.lines.map((line, i) => (
          <tspan key={line} x={node.cx} y={startY + i * lineHeight}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

export function HeroNetworkVisual() {
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
        {NODES.map((node) => (
          <g key={node.id}>
            <path
              d={CONNECTORS[node.id]}
              fill="none"
              stroke="var(--primary)"
              strokeOpacity={0.35}
              strokeWidth={1.5}
            />
            <path
              d={CONNECTORS[node.id]}
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
        {NODES.map((node) => (
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
            fill="#16151f"
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
            fill="#ffffff"
          >
            Votre entreprise
          </text>
        </g>
      </svg>
    </div>
  );
}
