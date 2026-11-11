/**
 * Hand-rolled vCard 3.0 (RFC 2426) serializer.
 * Escapes user text; folds by UTF-8 octets; never concatenates raw values into properties.
 */

export type VCardSource = {
  displayName: string;
  jobTitle: string | null;
  companyName: string | null;
  summary: string | null;
  phone: string | null;
  /** Already projected public email (null when hidden). */
  email: string | null;
  websiteUrl: string | null;
  canonicalUrl: string;
};

const CRLF = '\r\n';
const MAX_OCTETS = 75;

export function escapeVCardText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n/g, '\n')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

/** Fold a single logical line to ≤75 octets without splitting UTF-8 code points. */
export function foldVCardLine(line: string): string {
  const chars = [...line];
  if (Buffer.byteLength(line, 'utf8') <= MAX_OCTETS) {
    return line;
  }

  const segments: string[] = [];
  let current = '';
  let currentBytes = 0;

  for (const char of chars) {
    const size = Buffer.byteLength(char, 'utf8');
    // Continuation lines include a leading space counted toward the 75-octet budget.
    const budget = segments.length === 0 ? MAX_OCTETS : MAX_OCTETS - 1;
    if (current.length > 0 && currentBytes + size > budget) {
      segments.push(current);
      current = char;
      currentBytes = size;
    } else {
      current += char;
      currentBytes += size;
    }
  }
  if (current.length > 0) {
    segments.push(current);
  }

  return segments
    .map((segment, index) => (index === 0 ? segment : ` ${segment}`))
    .join(CRLF);
}

function propertyLine(name: string, value: string): string {
  return foldVCardLine(`${name}:${escapeVCardText(value)}`);
}

function isSafeHttpUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Build a vCard 3.0 document from public card projection + canonical URL.
 */
export function buildVCard30(source: VCardSource): string {
  const displayName = source.displayName.trim();
  if (!displayName) {
    throw new Error('displayName is required for vCard');
  }

  const lines: string[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    propertyLine('FN', displayName),
    // Structured name fallback: entire displayName in family-name slot.
    foldVCardLine(`N:${escapeVCardText(displayName)};;;;`),
  ];

  if (source.companyName?.trim()) {
    lines.push(propertyLine('ORG', source.companyName.trim()));
  }
  if (source.jobTitle?.trim()) {
    lines.push(propertyLine('TITLE', source.jobTitle.trim()));
  }
  if (source.phone?.trim()) {
    lines.push(
      foldVCardLine(`TEL;TYPE=VOICE:${escapeVCardText(source.phone.trim())}`),
    );
  }
  if (source.email?.trim()) {
    lines.push(
      foldVCardLine(
        `EMAIL;TYPE=INTERNET:${escapeVCardText(source.email.trim())}`,
      ),
    );
  }
  if (source.websiteUrl?.trim() && isSafeHttpUrl(source.websiteUrl.trim())) {
    lines.push(propertyLine('URL', source.websiteUrl.trim()));
  }
  if (source.canonicalUrl && isSafeHttpUrl(source.canonicalUrl)) {
    lines.push(propertyLine('URL', source.canonicalUrl));
  }
  if (source.summary?.trim()) {
    lines.push(propertyLine('NOTE', source.summary.trim()));
  }

  lines.push('END:VCARD');
  return `${lines.join(CRLF)}${CRLF}`;
}
