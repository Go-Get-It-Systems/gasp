export const PIP_WIDTH = 120;
export const PIP_HEIGHT = 160;
export const MARGIN = 12;

export interface PipPosition {
  x: number;
  y: number;
}

export function clampPipPosition(
  x: number,
  y: number,
  screenWidth: number,
  screenHeight: number,
): PipPosition {
  return {
    x: Math.max(MARGIN, Math.min(screenWidth - PIP_WIDTH - MARGIN, x)),
    y: Math.max(MARGIN, Math.min(screenHeight - PIP_HEIGHT - MARGIN, y)),
  };
}

export function parsePipPosition(raw: string | null): PipPosition | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') return null;
    return { x: parsed.x, y: parsed.y };
  } catch {
    return null;
  }
}
