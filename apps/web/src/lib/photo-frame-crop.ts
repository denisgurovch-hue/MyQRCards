/** Square avatar frame crop helpers (client-side only). */

export type FrameCropState = {
  /** Image natural width */
  imageWidth: number;
  /** Image natural height */
  imageHeight: number;
  /** Viewport / frame size in CSS pixels (square) */
  frameSize: number;
  /** User zoom multiplier (>= 1). 1 = cover-fit */
  zoom: number;
  /** Image left edge relative to frame, CSS px */
  offsetX: number;
  /** Image top edge relative to frame, CSS px */
  offsetY: number;
};

export function coverScale(
  imageWidth: number,
  imageHeight: number,
  frameSize: number,
): number {
  if (imageWidth <= 0 || imageHeight <= 0 || frameSize <= 0) {
    return 1;
  }
  return Math.max(frameSize / imageWidth, frameSize / imageHeight);
}

export function displayedSize(state: Pick<FrameCropState, 'imageWidth' | 'imageHeight' | 'frameSize' | 'zoom'>) {
  const scale = coverScale(state.imageWidth, state.imageHeight, state.frameSize) * state.zoom;
  return {
    scale,
    width: state.imageWidth * scale,
    height: state.imageHeight * scale,
  };
}

/** Clamp pan so the frame never shows empty space outside the image. */
export function clampOffsets(state: FrameCropState): Pick<FrameCropState, 'offsetX' | 'offsetY'> {
  const { width, height } = displayedSize(state);
  const minX = state.frameSize - width;
  const minY = state.frameSize - height;
  return {
    offsetX: Math.min(0, Math.max(minX, state.offsetX)),
    offsetY: Math.min(0, Math.max(minY, state.offsetY)),
  };
}

/** Change zoom while keeping the frame center over the same image point. */
export function withZoom(state: FrameCropState, zoom: number): FrameCropState {
  const nextZoom = Math.min(3, Math.max(1, zoom));
  if (nextZoom === state.zoom) {
    return state;
  }
  const oldScale = displayedSize(state).scale;
  const centerX = state.frameSize / 2;
  const centerY = state.frameSize / 2;
  const imageX = (centerX - state.offsetX) / oldScale;
  const imageY = (centerY - state.offsetY) / oldScale;
  const next: FrameCropState = { ...state, zoom: nextZoom };
  const newScale = displayedSize(next).scale;
  const offsets = clampOffsets({
    ...next,
    offsetX: centerX - imageX * newScale,
    offsetY: centerY - imageY * newScale,
  });
  return { ...next, ...offsets };
}

export function initialCropState(
  imageWidth: number,
  imageHeight: number,
  frameSize: number,
): FrameCropState {
  const zoom = 1;
  const { width, height } = displayedSize({
    imageWidth,
    imageHeight,
    frameSize,
    zoom,
  });
  return {
    imageWidth,
    imageHeight,
    frameSize,
    zoom,
    offsetX: (frameSize - width) / 2,
    offsetY: (frameSize - height) / 2,
  };
}

/** Source rectangle in natural image pixels corresponding to the frame. */
export function sourceRect(state: FrameCropState): {
  sx: number;
  sy: number;
  sSize: number;
} {
  const { scale } = displayedSize(state);
  const sx = -state.offsetX / scale;
  const sy = -state.offsetY / scale;
  const sSize = state.frameSize / scale;
  return { sx, sy, sSize };
}

export async function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.decoding = 'async';
  image.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Не удалось прочитать изображение'));
    image.src = src;
  });
  return image;
}

/**
 * Rasterize the framed region to a square JPEG blob for upload.
 * Server still re-encodes to WebP and strips metadata.
 */
export async function exportFramedJpeg(
  image: CanvasImageSource,
  state: FrameCropState,
  outputSize = 800,
  quality = 0.9,
): Promise<Blob> {
  const { sx, sy, sSize } = sourceRect(state);
  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Не удалось подготовить изображение');
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, sx, sy, sSize, sSize, 0, 0, outputSize, outputSize);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality),
  );
  if (!blob) {
    throw new Error('Не удалось подготовить изображение');
  }
  return blob;
}
