import { describe, expect, it } from 'vitest';
import type { CardDraft } from './card-draft';
import { draftFromMeProfile } from './draft-from-me';

function empty(): CardDraft {
  return {
    displayName: '',
    lastName: '',
    firstName: '',
    patronymic: '',
    showPatronymic: false,
    jobTitle: '',
    companyName: '',
    summary: '',
    phone: '',
    email: '',
    showEmail: false,
    websiteUrl: '',
    links: [],
    contactOrder: ['phone', 'email', 'website'],
    photoUrl: null,
    coverColor: null,
    coverImageUrl: null,
    slug: '',
    status: 'draft',
  };
}

describe('draftFromMeProfile', () => {
  it('copies FIO parts and email', () => {
    const draft = draftFromMeProfile(
      {
        email: 'a@example.com',
        lastName: 'Иванов',
        firstName: 'Иван',
        patronymic: 'Иванович',
      },
      empty(),
    );
    expect(draft).toMatchObject({
      lastName: 'Иванов',
      firstName: 'Иван',
      patronymic: 'Иванович',
      displayName: 'Иванов Иван Иванович',
      email: 'a@example.com',
      showEmail: false,
    });
  });

  it('falls back legacy displayName into lastName', () => {
    const draft = draftFromMeProfile(
      { email: 'b@example.com', displayName: 'Old Name' },
      empty(),
    );
    expect(draft.lastName).toBe('Old Name');
    expect(draft.firstName).toBe('');
    expect(draft.email).toBe('b@example.com');
  });
});
