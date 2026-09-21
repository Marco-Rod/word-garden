import Phaser from 'phaser';

export interface LayoutMetrics {
  width: number;
  height: number;
  safeTop: number;
  safeBottom: number;
  contentWidth: number;
  contentHeight: number;
  isCompact: boolean;
  isShort: boolean;
  scale: number;
}

export function getLayoutMetrics(scale: Phaser.Scale.ScaleManager): LayoutMetrics {
  const width = scale.width;
  const height = scale.height;
  const isCompact = width < 430;
  const isShort = height < 680;
  const horizontalMargin = isCompact ? 12 : 24;
  return {
    width,
    height,
    safeTop: isShort ? 10 : 16,
    safeBottom: isShort ? 10 : 16,
    contentWidth: width - horizontalMargin * 2,
    contentHeight: height - (isShort ? 20 : 32),
    isCompact,
    isShort,
    scale: Phaser.Math.Clamp(width / 390, 0.82, 1.22),
  };
}

/** Reduces a text object until it fits; uses a two-line fallback if necessary. */
export function fitTextToWidth(
  text: Phaser.GameObjects.Text,
  value: string,
  maxWidth: number,
  preferredSize: number,
  minSize: number,
): void {
  text.setText(value).setFontSize(preferredSize);
  for (let size = preferredSize; size >= minSize && text.width > maxWidth; size--) text.setFontSize(size);
  if (text.width <= maxWidth) return;

  const words = value.split(' ');
  if (words.length < 2) return;
  const midpoint = Math.ceil(words.length / 2);
  text.setText(`${words.slice(0, midpoint).join(' ')}\n${words.slice(midpoint).join(' ')}`);
  text.setFontSize(preferredSize);
  for (let size = preferredSize; size >= minSize && text.width > maxWidth; size--) text.setFontSize(size);
}
