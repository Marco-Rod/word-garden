export const COLOR_BACKGROUND = '#8fd3ff';

export const OUTLINES = {
  tileIdle: 0x29b6f6,
  tileSelected: 0xfb8c00,
  tileFound: 0x43a047,
};

export const FILLS = {
  tileIdle: 0xffffff,
  tileSelected: 0xffe082,
  tileFound: 0xa5d6a7,
  button: 0xfb8c00,
  panel: 0xffffff,
  panelBorder: 0xffca28,
  strikethrough: 0x2e7d32,
};

export const WORD_FOUND_COLORS = [
  { fill: 0xa5d6a7, stroke: 0x2e7d32 },
  { fill: 0xffcc80, stroke: 0xef6c00 },
  { fill: 0x90caf9, stroke: 0x1565c0 },
  { fill: 0xce93d8, stroke: 0x7b1fa2 },
  { fill: 0xffab91, stroke: 0xd84315 },
  { fill: 0x80deea, stroke: 0x00838f },
] as const;

export const INK = {
  dark: '#1b4f72',
  body: '#5d4037',
  muted: '#9e9e9e',
  white: '#ffffff',
};

export const FONT =
  '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Arial Rounded MT Bold", Arial, sans-serif';

export const LAYOUT = {
  headerH: 104,
  bottomH: 46,
  margin: 28,
};
