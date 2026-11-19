export type CardNameParts = {
  lastName: string | null;
  firstName: string | null;
  patronymic: string | null;
  /** Derived: true when patronymic is non-empty (kept for DB/API compatibility). */
  showPatronymic: boolean;
};

/** Visible public name: Last First [Patronymic if present]. */
export function composeDisplayName(parts: {
  lastName?: string | null;
  firstName?: string | null;
  patronymic?: string | null;
}): string {
  const last = parts.lastName?.trim() || '';
  const first = parts.firstName?.trim() || '';
  const patronymic = parts.patronymic?.trim() || '';
  return [last, first, patronymic].filter(Boolean).join(' ').trim();
}

/** Structured vCard N components (family;given;additional). */
export function vcardNameComponents(parts: {
  lastName?: string | null;
  firstName?: string | null;
  patronymic?: string | null;
}): {
  family: string;
  given: string;
  additional: string;
} {
  return {
    family: parts.lastName?.trim() || '',
    given: parts.firstName?.trim() || '',
    additional: parts.patronymic?.trim() || '',
  };
}

export function resolveCardNameInput(input: {
  lastName?: string | null;
  firstName?: string | null;
  patronymic?: string | null;
  showPatronymic?: boolean;
  displayName?: string | null;
}): {
  lastName: string | null;
  firstName: string | null;
  patronymic: string | null;
  showPatronymic: boolean;
  displayName: string;
} {
  const lastName = input.lastName?.trim() || '';
  const firstName = input.firstName?.trim() || '';
  const patronymic = input.patronymic?.trim() || null;
  const hasParts = Boolean(lastName || firstName || patronymic);

  if (hasParts) {
    if (!lastName || !firstName) {
      throw new Error('LAST_FIRST_REQUIRED');
    }
    return {
      lastName,
      firstName,
      patronymic,
      // Kept in sync: show when patronymic is filled (no UI toggle).
      showPatronymic: Boolean(patronymic),
      displayName: composeDisplayName({
        lastName,
        firstName,
        patronymic,
      }),
    };
  }

  const displayName = input.displayName?.trim() || '';
  if (!displayName) {
    throw new Error('DISPLAY_NAME_REQUIRED');
  }
  return {
    lastName: null,
    firstName: null,
    patronymic: null,
    showPatronymic: false,
    displayName,
  };
}
