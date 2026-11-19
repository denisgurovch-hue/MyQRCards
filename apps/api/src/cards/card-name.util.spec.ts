import {
  composeDisplayName,
  resolveCardNameInput,
  vcardNameComponents,
} from './card-name.util';

describe('card-name.util', () => {
  it('composes visible name without empty patronymic', () => {
    expect(
      composeDisplayName({
        lastName: 'Иванов',
        firstName: 'Иван',
        patronymic: '',
      }),
    ).toBe('Иванов Иван');
  });

  it('includes patronymic when present', () => {
    expect(
      composeDisplayName({
        lastName: 'Иванов',
        firstName: 'Иван',
        patronymic: 'Иванович',
      }),
    ).toBe('Иванов Иван Иванович');
  });

  it('builds vCard N components', () => {
    expect(
      vcardNameComponents({
        lastName: 'Иванов',
        firstName: 'Иван',
        patronymic: 'Иванович',
      }),
    ).toEqual({
      family: 'Иванов',
      given: 'Иван',
      additional: 'Иванович',
    });
    expect(
      vcardNameComponents({
        lastName: 'Иванов',
        firstName: 'Иван',
        patronymic: null,
      }).additional,
    ).toBe('');
  });

  it('resolves parts input and rejects incomplete parts', () => {
    expect(
      resolveCardNameInput({
        lastName: 'Петров',
        firstName: 'Пётр',
        patronymic: 'Петрович',
      }),
    ).toMatchObject({
      lastName: 'Петров',
      firstName: 'Пётр',
      patronymic: 'Петрович',
      showPatronymic: true,
      displayName: 'Петров Пётр Петрович',
    });
    expect(
      resolveCardNameInput({
        lastName: 'Петров',
        firstName: 'Пётр',
      }),
    ).toMatchObject({
      showPatronymic: false,
      displayName: 'Петров Пётр',
    });
    expect(() =>
      resolveCardNameInput({ lastName: 'Only', firstName: '' }),
    ).toThrow('LAST_FIRST_REQUIRED');
  });

  it('keeps legacy displayName without parts', () => {
    expect(resolveCardNameInput({ displayName: 'Старое Имя' })).toEqual({
      lastName: null,
      firstName: null,
      patronymic: null,
      showPatronymic: false,
      displayName: 'Старое Имя',
    });
  });
});
