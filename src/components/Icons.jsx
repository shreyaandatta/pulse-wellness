// Minimal inline icon set — stroke-based, inherits currentColor.
const I = ({ d, size = 22, fill = 'none', children, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...rest}>
    {d ? <path d={d} /> : children}
  </svg>
);

export const IconHome = (p) => <I {...p} d="M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9" />;
export const IconTrends = (p) => <I {...p}><path d="M4 19V5"/><path d="M4 15l4-4 4 3 7-8"/><path d="M21 6v0"/></I>;
export const IconGear = (p) => <I {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></I>;
export const IconMoon = (p) => <I {...p} d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />;
export const IconSun = (p) => <I {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></I>;
export const IconPlus = (p) => <I {...p} d="M12 5v14M5 12h14" />;
export const IconChevronL = (p) => <I {...p} d="M15 18l-6-6 6-6" />;
export const IconChevronR = (p) => <I {...p} d="M9 18l6-6-6-6" />;
export const IconTrash = (p) => <I {...p}><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></I>;
export const IconDrop = (p) => <I {...p} fill="currentColor" stroke="none"><path d="M12 2.7c3 4 6 7.2 6 10.8a6 6 0 1 1-12 0C6 9.9 9 6.7 12 2.7z"/></I>;
export const IconFire = (p) => <I {...p}><path d="M12 2s4 3.5 4 8a4 4 0 0 1-8 0c0-1 .3-1.8.8-2.5C8 9 8 7 8 7s-2 2-2 6a6 6 0 1 0 12 0c0-5-6-11-6-11z"/></I>;
export const IconLeaf = (p) => <I {...p}><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2.5 1.5 6.5-1.5 9.5A7 7 0 0 1 11 20z"/><path d="M2 22c5-5 7-7 11-9"/></I>;
export const IconHeart = (p) => <I {...p}><path d="M19 14c1.5-1.5 3-3.4 3-5.5A4.5 4.5 0 0 0 12 6 4.5 4.5 0 0 0 2 8.5C2 12 7 16 12 21c2-2 5-4.5 7-7z"/></I>;
export const IconBolt = (p) => <I {...p} d="M13 2 4.5 13.5H11l-1 8.5L19.5 10H13z" />;
export const IconShoe = (p) => <I {...p}><path d="M2 17h13l5-1c1.5-.3 2-1.4 2-2.5 0-1-.7-1.7-1.8-2L13 8 9 5l-2 1 1 4-6 2z"/><path d="M2 17v2h20v-1"/></I>;
export const IconCheck = (p) => <I {...p} d="M20 6 9 17l-5-5" />;
export const IconShield = (p) => <I {...p}><path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3z"/><path d="M9 12l2 2 4-4"/></I>;
export const IconDownload = (p) => <I {...p}><path d="M12 3v12"/><path d="M7 11l5 5 5-5"/><path d="M5 21h14"/></I>;
export const IconUpload = (p) => <I {...p}><path d="M12 21V9"/><path d="M7 13l5-5 5 5"/><path d="M5 3h14"/></I>;
export const IconInsight = (p) => <I {...p}><path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.2 1 2.5h6c0-1.3.3-1.8 1-2.5A6 6 0 0 0 12 3z"/></I>;
export const IconUsers = (p) => <I {...p}><path d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1"/><circle cx="9" cy="7" r="3.2"/><path d="M22 19v-1a4 4 0 0 0-3-3.85"/><path d="M16 3.15A4 4 0 0 1 16 11"/></I>;
