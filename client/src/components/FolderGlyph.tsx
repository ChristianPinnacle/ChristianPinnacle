type FolderGlyphProps = {
  kind: string;
  color: string;
};

export default function FolderGlyph({ kind, color }: FolderGlyphProps) {
  const props = { width: 16, height: 16, viewBox: "0 0 24 24", style: { flexShrink: 0 } as const };

  switch (kind) {
    case "projects":
      return (
        <svg {...props}>
          <path d="M12 1 L14.5 9 L23 12 L14.5 15 L12 23 L9.5 15 L1 12 L9.5 9 Z" fill={color} />
        </svg>
      );
    case "areas":
      return (
        <svg {...props}>
          <path d="M2 18 L4 7 L9 12 L12 4 L15 12 L20 7 L22 18 Z" fill={color} />
          <rect x="2" y="19" width="20" height="3" rx="1" fill={color} />
        </svg>
      );
    case "resources":
      return (
        <svg {...props}>
          <rect x="4" y="2" width="16" height="20" rx="8" fill="none" stroke={color} strokeWidth="2.4" />
          <line x1="4" y1="12" x2="20" y2="12" stroke={color} strokeWidth="2.4" />
          <circle cx="12" cy="7" r="2" fill={color} />
        </svg>
      );
    case "warroom":
      return (
        <svg {...props}>
          <path
            d="M4 20 L20 4 M4 12 L12 4 M12 20 L20 12"
            stroke={color}
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      );
    case "archive":
      return (
        <svg {...props}>
          <path d="M5 22 L5 9 Q12 1 19 9 L19 22 Z" fill="none" stroke={color} strokeWidth="2.2" />
          <line x1="12" y1="9" x2="12" y2="16" stroke={color} strokeWidth="2.2" />
          <line x1="8.5" y1="12" x2="15.5" y2="12" stroke={color} strokeWidth="2.2" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <path d="M13 2 L5 14 H11 L9 22 L19 9 H13 Z" fill={color} />
        </svg>
      );
  }
}
