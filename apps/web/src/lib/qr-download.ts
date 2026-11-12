export function qrEndpoint(slug: string, format: 'png' | 'svg') {
  return `/api/v1/public/cards/${encodeURIComponent(slug)}/qr.${format}`;
}

export async function fetchQrBlob(
  slug: string,
  format: 'png' | 'svg',
): Promise<Blob> {
  const response = await fetch(qrEndpoint(slug, format), {
    method: 'GET',
    credentials: 'omit',
    cache: 'no-store',
  });
  const contentType = response.headers.get('content-type') ?? '';
  const okType =
    format === 'png'
      ? contentType.includes('image/png')
      : contentType.includes('image/svg');

  if (!response.ok || !okType) {
    const error = new Error(
      response.status === 404
        ? 'Визитка недоступна для QR-кода. Опубликуйте её снова.'
        : 'Не удалось загрузить QR-код.',
    ) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return response.blob();
}

export function triggerDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
