export type CardNameParts = {
  lastName: string | null;
  firstName: string | null;
  patronymic: string | null;
  showPatronymic: boolean;
};

/** Visible public name: Last First [Patronymic if shown]. */
export function composeDisplayName(parts: {
  lastName?: string | null;
  firstName?: string | null;
  patronymic?: string | null;
  showPatronymic?: boolean;
}): string {
  const last = parts.lastName?.trim() || '';
  const first = parts.firstName?.trim() || '';
  const patronymic =
    parts.showPatronymic && parts.patronymic?.trim()
      ? parts.patronymic.trim()
      : '';
  return [last, first, patronymic].filter(Boolean).join(' ').trim();
}

/** Structured vCard N components (family;given;additional). */
export function vcardNameComponents(parts: CardNameParts): {
  family: string;
  given: string;
  additional: string;
} {
  const family = parts.lastName?.trim() || '';
  const given = parts.firstName?.trim() || '';
  const additional =
    parts.showPatronymic && parts.patronymic?.trim()
      ? parts.patronymic.trim()
      : '';
  return { family, given, additional };
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
  const showPatronymic = Boolean(input.showPatronymic);
  const hasParts = Boolean(lastName || firstName || patronymic);

  if (hasParts) {
    if (!lastName || !firstName) {
      throw new Error('LAST_FIRST_REQUIRED');
    }
    return {
      lastName,
      firstName,
      patronymic,
      showPatronymic,
      displayName: composeDisplayName({
        lastName,
        firstName,
        patronymic,
        showPatronymic,
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
