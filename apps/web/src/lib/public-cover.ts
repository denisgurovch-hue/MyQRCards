export type PublicCoverMode = 'default' | 'color' | 'image';

export function resolvePublicCoverMode(input: {
  coverColor?: string | null;
  coverImageUrl?: string | null;
}): PublicCoverMode {
  if (input.coverImageUrl?.trim()) {
    return 'image';
  }
  if (input.coverColor?.trim()) {
    return 'color';
  }
  return 'default';
}

export function publicCoverCssVars(input: {
  coverColor?: string | null;
  coverImageUrl?: string | null;
}): Record<string, string> {
  const vars: Record<string, string> = {};
  if (input.coverColor?.trim()) {
    vars['--public-cover-color'] = input.coverColor.trim();
  }
  if (input.coverImageUrl?.trim()) {
    vars['--public-cover-image'] = `url("${input.coverImageUrl.trim().replace(/"/g, '')}")`;
  }
  return vars;
}
