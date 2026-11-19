import { composeDisplayName } from './card-name';
import { cloneDraft, type CardDraft } from './card-draft';

export type MeProfile = {
  email?: string | null;
  lastName?: string | null;
  firstName?: string | null;
  patronymic?: string | null;
  displayName?: string | null;
};

/**
 * Prefill create-mode draft from /auth/me (name parts + email).
 * Caller should keep baseline empty so Save is enabled with defaults.
 */
export function draftFromMeProfile(me: MeProfile, base: CardDraft): CardDraft {
  const lastName = (me.lastName ?? '').trim();
  const firstName = (me.firstName ?? '').trim();
  const patronymic = (me.patronymic ?? '').trim();
  const hasParts = Boolean(lastName || firstName || patronymic);

  let nextLast = lastName;
  let nextFirst = firstName;
  let nextPatronymic = patronymic;
  if (!hasParts && me.displayName?.trim()) {
    nextLast = me.displayName.trim();
  }

  const displayName = hasParts
    ? composeDisplayName({
        lastName: nextLast,
        firstName: nextFirst,
        patronymic: nextPatronymic,
      })
    : nextLast;

  return {
    ...cloneDraft(base),
    lastName: nextLast,
    firstName: nextFirst,
    patronymic: nextPatronymic,
    showPatronymic: Boolean(nextPatronymic),
    displayName,
    email: (me.email ?? '').trim(),
  };
}
