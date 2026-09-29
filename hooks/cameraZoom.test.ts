import { calculateZoomFromPinch } from './cameraZoom';

describe('calculateZoomFromPinch', () => {
  test('scale=1 returns base zoom (no change)', () => {
    expect(calculateZoomFromPinch(0.3, 1)).toBeCloseTo(0.3);
  });

  test('scale>1 increases zoom (pinch out)', () => {
    expect(calculateZoomFromPinch(0.0, 2)).toBeCloseTo(0.5); // (2-1)*0.5 = 0.5
  });

  test('scale<1 decreases zoom (pinch in)', () => {
    expect(calculateZoomFromPinch(0.5, 0.5)).toBeCloseTo(0.25); // 0.5 + (0.5-1)*0.5 = 0.25
  });

  test('clamps zoom to max 1', () => {
    expect(calculateZoomFromPinch(0.9, 10)).toBe(1);
  });

  test('clamps zoom to min 0', () => {
    expect(calculateZoomFromPinch(0.1, 0)).toBe(0);
  });

  test('accepts custom sensitivity', () => {
    expect(calculateZoomFromPinch(0.0, 2, 1.0)).toBeCloseTo(1.0); // (2-1)*1.0 = 1, clamped to 1
    expect(calculateZoomFromPinch(0.0, 1.5, 0.2)).toBeCloseTo(0.1); // (1.5-1)*0.2 = 0.1
  });
});
