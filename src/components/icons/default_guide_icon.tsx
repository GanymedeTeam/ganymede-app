interface DefaultGuideIconProps {
  className?: string
  size?: number
}

export function DefaultGuideIcon({ className, size = 32 }: DefaultGuideIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        {/* Gradient pour l'icône */}
        <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#60a5fa' }} />
          <stop offset="50%" style={{ stopColor: '#3b82f6' }} />
          <stop offset="100%" style={{ stopColor: '#2563eb' }} />
        </linearGradient>

        {/* Ombre portée subtile */}
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="1" dy="1" stdDeviation="1" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Icône document/parchemin */}
      <g transform="translate(16, 16)" filter="url(#shadow)">
        {/* Corps du document */}
        <rect x="-8" y="-10" width="16" height="18" rx="2" fill="url(#iconGradient)" />

        {/* Coin plié en haut à droite */}
        <path d="M 6 -10 L 8 -8 L 6 -8 Z" fill="#2563eb" />
        <path d="M 6 -10 L 8 -8" stroke="#1d4ed8" strokeWidth="0.5" />

        {/* Lignes de contenu */}
        <rect x="-5" y="-6" width="8" height="1" rx="0.5" fill="#ffffff" opacity="0.8" />
        <rect x="-5" y="-4" width="6" height="1" rx="0.5" fill="#ffffff" opacity="0.6" />
        <rect x="-5" y="-2" width="7" height="1" rx="0.5" fill="#ffffff" opacity="0.6" />

        {/* Numéros d'étapes */}
        <circle cx="-3" cy="2" r="2" fill="#2563eb" />
        <text
          x="-3"
          y="3"
          textAnchor="middle"
          fill="#ffffff"
          fontFamily="Arial, sans-serif"
          fontSize="2.5"
          fontWeight="bold"
        >
          1
        </text>

        <circle cx="0" cy="2" r="2" fill="#2563eb" />
        <text
          x="0"
          y="3"
          textAnchor="middle"
          fill="#ffffff"
          fontFamily="Arial, sans-serif"
          fontSize="2.5"
          fontWeight="bold"
        >
          2
        </text>

        <circle cx="3" cy="2" r="2" fill="#2563eb" />
        <text
          x="3"
          y="3"
          textAnchor="middle"
          fill="#ffffff"
          fontFamily="Arial, sans-serif"
          fontSize="2.5"
          fontWeight="bold"
        >
          3
        </text>

        {/* Petite flèche indicative */}
        <path d="M -1 6 L 1 6 M 0 5 L 1 6 L 0 7" stroke="#2563eb" strokeWidth="1" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  )
}
