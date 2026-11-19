export function composeDisplayName(parts: {
  lastName: string;
  firstName: string;
  patronymic: string;
}): string {
  const last = parts.lastName.trim();
  const first = parts.firstName.trim();
  const patronymic = parts.patronymic.trim();
  return [last, first, patronymic].filter(Boolean).join(' ').trim();
}
