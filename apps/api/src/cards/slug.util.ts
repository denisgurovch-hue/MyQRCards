import { randomBytes } from 'crypto';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CYR_MAP: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};

export function normalizeSlug(input: string): string {
  return input.trim().toLowerCase();
}

export function isValidSlug(slug: string): boolean {
  return slug.length >= 6 && slug.length <= 32 && SLUG_RE.test(slug);
}

export function slugifyFromName(displayName: string): string {
  const lowered = displayName.trim().toLowerCase();
  let out = '';
  for (const char of lowered) {
    if (CYR_MAP[char] !== undefined) {
      out += CYR_MAP[char];
      continue;
    }
    if (/[a-z0-9]/.test(char)) {
      out += char;
      continue;
    }
    if (/\s|-|_/.test(char)) {
      out += '-';
    }
  }
  out = out.replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (out.length < 3) {
    out = 'card';
  }
  out = out.slice(0, 24).replace(/-$/g, '');
  const suffix = randomBytes(2).toString('hex');
  let candidate = `${out}-${suffix}`;
  if (candidate.length < 6) {
    candidate = `card-${suffix}${randomBytes(1).toString('hex')}`;
  }
  return candidate.slice(0, 32);
}
