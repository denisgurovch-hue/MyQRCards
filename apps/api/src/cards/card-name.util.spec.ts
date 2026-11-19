import {
  composeDisplayName,
  resolveCardNameInput,
  vcardNameComponents,
} from './card-name.util';

describe('card-name.util', () => {
  it('composes visible name without patronymic by default', () => {
    expect(
      composeDisplayName({
        lastName: 'Иванов',
        firstName: 'Иван',
        patronymic: 'Иванович',
        showPatronymic: false,
      }),
    ).toBe('Иванов Иван');
  });

  it('includes patronymic when showPatronymic is true', () => {
    expect(
      composeDisplayName({
        lastName: 'Иванов',
        firstName: 'Иван',
        patronymic: 'Иванович',
        showPatronymic: true,
      }),
    ).toBe('Иванов Иван Иванович');
  });

  it('builds vCard N components', () => {
    expect(
      vcardNameComponents({
        lastName: 'Иванов',
        firstName: 'Иван',
        patronymic: 'Иванович',
        showPatronymic: true,
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
        patronymic: 'Иванович',
        showPatronymic: false,
      }).additional,
    ).toBe('');
  });

  it('resolves parts input and rejects incomplete parts', () => {
    expect(
      resolveCardNameInput({
        lastName: 'Петров',
        firstName: 'Пётр',
        showPatronymic: false,
      }),
    ).toMatchObject({
      lastName: 'Петров',
      firstName: 'Пётр',
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
