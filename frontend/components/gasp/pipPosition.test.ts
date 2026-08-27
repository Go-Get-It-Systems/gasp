import { clampPipPosition, parsePipPosition, PIP_WIDTH, PIP_HEIGHT, MARGIN } from './pipPosition';

const SCREEN_WIDTH = 400;
const SCREEN_HEIGHT = 800;

describe('clampPipPosition', () => {
  test('keeps in-bounds position unchanged', () => {
    expect(clampPipPosition(100, 200, SCREEN_WIDTH, SCREEN_HEIGHT)).toEqual({ x: 100, y: 200 });
  });

  test('clamps negative x to MARGIN', () => {
    expect(clampPipPosition(-50, 200, SCREEN_WIDTH, SCREEN_HEIGHT).x).toBe(MARGIN);
  });

  test('clamps negative y to MARGIN', () => {
    expect(clampPipPosition(100, -50, SCREEN_WIDTH, SCREEN_HEIGHT).y).toBe(MARGIN);
  });

  test('clamps x past right edge', () => {
    const result = clampPipPosition(SCREEN_WIDTH + 100, 200, SCREEN_WIDTH, SCREEN_HEIGHT);
    expect(result.x).toBe(SCREEN_WIDTH - PIP_WIDTH - MARGIN);
  });

  test('clamps y past bottom edge', () => {
    const result = clampPipPosition(100, SCREEN_HEIGHT + 100, SCREEN_WIDTH, SCREEN_HEIGHT);
    expect(result.y).toBe(SCREEN_HEIGHT - PIP_HEIGHT - MARGIN);
  });

  test('handles tiny screen by collapsing range (still respects MARGIN)', () => {
    // Even when screen is too small, lower bound (MARGIN) wins over the upper bound.
    const result = clampPipPosition(0, 0, 50, 50);
    expect(result.x).toBe(MARGIN);
    expect(result.y).toBe(MARGIN);
  });
});

describe('parsePipPosition', () => {
  test('returns null for null input', () => {
    expect(parsePipPosition(null)).toBeNull();
  });

  test('returns null for empty string', () => {
    expect(parsePipPosition('')).toBeNull();
  });

  test('returns null for invalid JSON', () => {
    expect(parsePipPosition('not json')).toBeNull();
  });

  test('returns null when x or y missing', () => {
    expect(parsePipPosition('{"x":10}')).toBeNull();
    expect(parsePipPosition('{"y":20}')).toBeNull();
  });

  test('returns null when x or y are not numbers', () => {
    expect(parsePipPosition('{"x":"10","y":20}')).toBeNull();
  });

  test('parses valid x/y pair', () => {
    expect(parsePipPosition('{"x":15,"y":25}')).toEqual({ x: 15, y: 25 });
  });

  test('ignores extra fields', () => {
    expect(parsePipPosition('{"x":15,"y":25,"foo":"bar"}')).toEqual({ x: 15, y: 25 });
  });
});
