import { describe, expect, it } from 'vitest';
import {
  clampOffsets,
  coverScale,
  displayedSize,
  initialCropState,
  nudgeOffsets,
  sourceRect,
  withZoom,
} from './photo-frame-crop';

describe('photo-frame-crop', () => {
  it('covers the frame with the shorter side at zoom 1', () => {
    expect(coverScale(2000, 1000, 200, 200)).toBe(0.2);
    expect(coverScale(1000, 2000, 200, 200)).toBe(0.2);
  });

  it('centers a landscape image inside a square frame', () => {
    const state = initialCropState(2000, 1000, 200);
    expect(state.frameWidth).toBe(200);
    expect(state.frameHeight).toBe(200);
    expect(state.offsetX).toBe(-100);
    expect(state.offsetY).toBe(0);
    expect(displayedSize(state).width).toBe(400);
    expect(displayedSize(state).height).toBe(200);
  });

  it('centers inside a wide cover frame', () => {
    const state = initialCropState(2000, 1000, 400, 160);
    expect(state.offsetX).toBe(0);
    expect(state.offsetY).toBeCloseTo(-20);
    expect(displayedSize(state).width).toBe(400);
    expect(displayedSize(state).height).toBe(200);
  });

  it('clamps pan so empty margins never appear', () => {
    const state = initialCropState(2000, 1000, 200);
    const clamped = clampOffsets({ ...state, offsetX: 50, offsetY: 50 });
    expect(clamped.offsetX).toBe(0);
    expect(clamped.offsetY).toBe(0);

    const far = clampOffsets({ ...state, offsetX: -9999, offsetY: -9999 });
    expect(far.offsetX).toBe(-200);
    expect(far.offsetY).toBe(0);
  });

  it('maps the visible frame back to natural image pixels', () => {
    const state = initialCropState(2000, 1000, 200);
    const rect = sourceRect(state);
    expect(rect.sWidth).toBeCloseTo(1000);
    expect(rect.sHeight).toBeCloseTo(1000);
    expect(rect.sx).toBeCloseTo(500);
    expect(rect.sy).toBeCloseTo(0);
  });

  it('keeps frame center stable when zooming', () => {
    const state = initialCropState(2000, 1000, 200);
    const zoomed = withZoom(state, 2);
    const before = sourceRect(state);
    const after = sourceRect(zoomed);
    const beforeCenterX = before.sx + before.sWidth / 2;
    const afterCenterX = after.sx + after.sWidth / 2;
    expect(afterCenterX).toBeCloseTo(beforeCenterX, 5);
    expect(after.sWidth).toBeCloseTo(before.sWidth / 2, 5);
  });

  it('nudges offsets within clamp bounds', () => {
    const state = initialCropState(2000, 1000, 200);
    const nudged = nudgeOffsets(state, -50, 0);
    expect(nudged.offsetX).toBe(state.offsetX - 50);
    const clamped = nudgeOffsets(state, 9999, 9999);
    expect(clamped.offsetX).toBe(0);
    expect(clamped.offsetY).toBe(0);
  });
});
