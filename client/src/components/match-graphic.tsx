/**
 * A small diagram of what the product actually does: two anonymous terminals
 * are joined for exactly as long as the session lasts.
 */
const MatchGraphic = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 440 232"
    fill="none"
    aria-hidden="true"
    className={className}
  >
    <defs>
      <linearGradient id="node-fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="hsl(0 0% 100% / 0.08)" />
        <stop offset="100%" stopColor="hsl(0 0% 100% / 0.015)" />
      </linearGradient>
      <linearGradient id="link-fill" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="hsl(0 0% 100% / 0.06)" />
        <stop offset="50%" stopColor="hsl(var(--signal) / 0.7)" />
        <stop offset="100%" stopColor="hsl(0 0% 100% / 0.06)" />
      </linearGradient>
    </defs>

    {/* Structure grid */}
    <g stroke="hsl(0 0% 100% / 0.05)">
      <path d="M0 58h440M0 174h440M110 0v232M330 0v232" />
    </g>

    {/* Node A */}
    <g>
      <rect
        x="18"
        y="76"
        width="128"
        height="88"
        rx="12"
        fill="url(#node-fill)"
        stroke="hsl(0 0% 100% / 0.13)"
      />
      <rect
        x="18.5"
        y="76.5"
        width="127"
        height="87"
        rx="11.5"
        stroke="hsl(0 0% 100% / 0.04)"
      />
      <circle cx="38" cy="96" r="6" fill="hsl(0 0% 100% / 0.14)" />
      <rect
        x="50"
        y="92"
        width="38"
        height="4"
        rx="2"
        fill="hsl(0 0% 100% / 0.2)"
      />
      <rect
        x="50"
        y="100"
        width="22"
        height="3"
        rx="1.5"
        fill="hsl(0 0% 100% / 0.1)"
      />
      <rect
        x="34"
        y="118"
        width="66"
        height="22"
        rx="7"
        fill="hsl(0 0% 100% / 0.07)"
      />
      <rect
        x="42"
        y="126"
        width="34"
        height="3"
        rx="1.5"
        fill="hsl(0 0% 100% / 0.22)"
      />
      <text
        x="34"
        y="154"
        fill="hsl(0 0% 100% / 0.34)"
        fontFamily="Geist Mono, monospace"
        fontSize="7.5"
        letterSpacing="1.6"
      >
        YOU · LOCAL
      </text>
    </g>

    {/* Node B */}
    <g>
      <rect
        x="294"
        y="76"
        width="128"
        height="88"
        rx="12"
        fill="url(#node-fill)"
        stroke="hsl(0 0% 100% / 0.13)"
      />
      <circle cx="314" cy="96" r="6" fill="hsl(0 0% 100% / 0.14)" />
      <rect
        x="326"
        y="92"
        width="38"
        height="4"
        rx="2"
        fill="hsl(0 0% 100% / 0.2)"
      />
      <rect
        x="326"
        y="100"
        width="22"
        height="3"
        rx="1.5"
        fill="hsl(0 0% 100% / 0.1)"
      />
      <rect
        x="318"
        y="118"
        width="54"
        height="22"
        rx="7"
        fill="hsl(var(--signal) / 0.14)"
        stroke="hsl(var(--signal) / 0.3)"
      />
      <rect
        x="326"
        y="126"
        width="30"
        height="3"
        rx="1.5"
        fill="hsl(var(--signal) / 0.55)"
      />
      <text
        x="310"
        y="154"
        fill="hsl(0 0% 100% / 0.34)"
        fontFamily="Geist Mono, monospace"
        fontSize="7.5"
        letterSpacing="1.6"
      >
        STRANGER · P2P
      </text>
    </g>

    {/* Link */}
    <line
      x1="146"
      y1="120"
      x2="294"
      y2="120"
      stroke="url(#link-fill)"
      strokeWidth="1"
    />
    <line
      x1="158"
      y1="120"
      x2="282"
      y2="120"
      stroke="hsl(var(--signal) / 0.55)"
      strokeWidth="1"
      strokeDasharray="2 6"
      className="animate-dash"
    />

    {/* Live node */}
    <circle cx="220" cy="120" r="16" stroke="hsl(0 0% 100% / 0.07)" />
    <circle
      cx="220"
      cy="120"
      r="9"
      fill="hsl(var(--background))"
      stroke="hsl(0 0% 100% / 0.16)"
    />
    <circle cx="220" cy="120" r="3" fill="hsl(var(--signal))" />
    <circle
      cx="220"
      cy="120"
      r="3"
      fill="hsl(var(--signal))"
      opacity="0.35"
      className="animate-ping-slow"
      style={{ transformOrigin: "220px 120px" }}
    />

    <text
      x="220"
      y="98"
      textAnchor="middle"
      fill="hsl(0 0% 100% / 0.4)"
      fontFamily="Geist Mono, monospace"
      fontSize="7.5"
      letterSpacing="1.6"
    >
      ROOM OPEN
    </text>
    <text
      x="220"
      y="146"
      textAnchor="middle"
      fill="hsl(0 0% 100% / 0.26)"
      fontFamily="Geist Mono, monospace"
      fontSize="7.5"
      letterSpacing="1.6"
    >
      00:00
    </text>
  </svg>
);

export default MatchGraphic;
