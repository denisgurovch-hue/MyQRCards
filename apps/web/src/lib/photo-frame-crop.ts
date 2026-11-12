/** Frame crop helpers (client-side only). Supports square avatars and wide covers. */

export type FrameCropState = {
  imageWidth: number;
  imageHeight: number;
  frameWidth: number;
  frameHeight: number;
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
  frameWidth: number,
  frameHeight: number,
): number {
  if (
    imageWidth <= 0 ||
    imageHeight <= 0 ||
    frameWidth <= 0 ||
    frameHeight <= 0
  ) {
    return 1;
  }
  return Math.max(frameWidth / imageWidth, frameHeight / imageHeight);
}

export function displayedSize(
  state: Pick<
    FrameCropState,
    'imageWidth' | 'imageHeight' | 'frameWidth' | 'frameHeight' | 'zoom'
  >,
) {
  const scale =
    coverScale(
      state.imageWidth,
      state.imageHeight,
      state.frameWidth,
      state.frameHeight,
    ) * state.zoom;
  return {
    scale,
    width: state.imageWidth * scale,
    height: state.imageHeight * scale,
  };
}

/** Clamp pan so the frame never shows empty space outside the image. */
export function clampOffsets(
  state: FrameCropState,
): Pick<FrameCropState, 'offsetX' | 'offsetY'> {
  const { width, height } = displayedSize(state);
  const minX = state.frameWidth - width;
  const minY = state.frameHeight - height;
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
  const centerX = state.frameWidth / 2;
  const centerY = state.frameHeight / 2;
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
  frameWidth: number,
  frameHeight = frameWidth,
): FrameCropState {
  const zoom = 1;
  const { width, height } = displayedSize({
    imageWidth,
    imageHeight,
    frameWidth,
    frameHeight,
    zoom,
  });
  return {
    imageWidth,
    imageHeight,
    frameWidth,
    frameHeight,
    zoom,
    offsetX: (frameWidth - width) / 2,
    offsetY: (frameHeight - height) / 2,
  };
}

/** Source rectangle in natural image pixels corresponding to the frame. */
export function sourceRect(state: FrameCropState): {
  sx: number;
  sy: number;
  sWidth: number;
  sHeight: number;
} {
  const { scale } = displayedSize(state);
  return {
    sx: -state.offsetX / scale,
    sy: -state.offsetY / scale,
    sWidth: state.frameWidth / scale,
    sHeight: state.frameHeight / scale,
  };
}

function isRemoteHttpUrl(src: string): boolean {
  return /^https?:\/\//i.test(src);
}

/**
 * Load pixels for canvas crop/export.
 * Avoid `crossOrigin=anonymous` on blob:/data: URLs — it fails in several
 * browsers (notably Safari) and surfaces as "Не удалось прочитать изображение".
 * For http(s) media, fetch→blob first so canvas export stays untainted
 * without depending on CORS headers.
 */
export async function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  let objectUrl: string | null = null;
  let loadSrc = src;

  try {
    if (isRemoteHttpUrl(src)) {
      const response = await fetch(src, {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error('Не удалось прочитать изображение');
      }
      const blob = await response.blob();
      if (!blob.type.startsWith('image/') && blob.type !== '') {
        throw new Error('Не удалось прочитать изображение');
      }
      objectUrl = URL.createObjectURL(blob);
      loadSrc = objectUrl;
    }

    const image = new Image();
    image.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(new Error('Не удалось прочитать изображение'));
      image.src = loadSrc;
    });
    return image;
  } finally {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}

/**
 * Rasterize the framed region to a JPEG blob for upload.
 * Server still re-encodes to WebP and strips metadata.
 */
export async function exportFramedJpeg(
  image: CanvasImageSource,
  state: FrameCropState,
  outputWidth = 800,
  outputHeight = outputWidth,
  quality = 0.9,
): Promise<Blob> {
  const { sx, sy, sWidth, sHeight } = sourceRect(state);
  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Не удалось подготовить изображение');
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    image,
    sx,
    sy,
    sWidth,
    sHeight,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality),
  );
  if (!blob) {
    throw new Error('Не удалось подготовить изображение');
  }
  return blob;
}
