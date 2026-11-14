'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';

type AuthKind = 'password' | 'vk';

type Flash = 'idle' | 'saving' | 'saved' | 'error';

type DeletePhase =
  | 'idle'
  | 'confirm'
  | 'deleting'
  | 'error'
  | 'done';

const DELETE_WORD = 'Удалить';

const SCENES = [
  { id: 'view', label: '1. Просмотр' },
  { id: 'dirty', label: '2. Несохранённое имя' },
  { id: 'save-error', label: '3. Ошибка сохранения' },
  { id: 'password', label: '4. Смена пароля' },
  { id: 'vk', label: '5. VK без пароля' },
  { id: 'delete', label: '6–9. Удаление' },
] as const;

type SceneId = (typeof SCENES)[number]['id'];

export function AccountPrototype() {
  const [scene, setScene] = useState<SceneId>('view');
  const [authKind, setAuthKind] = useState<AuthKind>('password');

  const [baselineName, setBaselineName] = useState('Денис Гуров');
  const [nameDraft, setNameDraft] = useState('Денис Гуров');
  const [email] = useState('owner@example.com');
  const [flash, setFlash] = useState<Flash>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [passwordFlash, setPasswordFlash] = useState<Flash>('idle');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [deletePhase, setDeletePhase] = useState<DeletePhase>('idle');
  const [deleteTyped, setDeleteTyped] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const dirty = nameDraft.trim() !== baselineName.trim();
  const hasPassword = authKind === 'password';
  const deleteReady = deleteTyped === DELETE_WORD;

  const loginLabel = useMemo(() => {
    if (authKind === 'vk') return 'Вход через VK ID';
    return 'Вход по e-mail и паролю';
  }, [authKind]);

  function applyScene(next: SceneId) {
    setScene(next);
    setFlash('idle');
    setSaveError(null);
    setPasswordFlash('idle');
    setPasswordError(null);
    setLeaveOpen(false);
    setDeleteError(null);
    setDeleteTyped('');
    setCurrentPassword('');
    setNewPassword('');
    setNewPassword2('');

    if (next === 'vk') {
      setAuthKind('vk');
      setBaselineName('VK User');
      setNameDraft('VK User');
      setDeletePhase('idle');
      return;
    }

    setAuthKind('password');
    setBaselineName('Денис Гуров');
    setNameDraft(next === 'dirty' ? 'Денис Гуров (черновик)' : 'Денис Гуров');

    if (next === 'save-error') {
      setNameDraft('Очень длинное имя для проверки переноса строк на узком экране');
      setSaveError('Не удалось сохранить. Проверьте соединение и попробуйте снова.');
      setFlash('error');
    }

    if (next === 'delete') {
      setDeletePhase('confirm');
    } else {
      setDeletePhase('idle');
    }
  }

  function onSaveName(event: FormEvent) {
    event.preventDefault();
    if (!nameDraft.trim() || flash === 'saving') return;
    setFlash('saving');
    setSaveError(null);
    window.setTimeout(() => {
      if (scene === 'save-error') {
        setFlash('error');
        setSaveError('Не удалось сохранить. Проверьте соединение и попробуйте снова.');
        return;
      }
      setBaselineName(nameDraft.trim());
      setFlash('saved');
    }, 450);
  }

  function onCancelName() {
    setNameDraft(baselineName);
    setSaveError(null);
    setFlash('idle');
  }

  function onSavePassword(event: FormEvent) {
    event.preventDefault();
    if (passwordFlash === 'saving') return;
    setPasswordError(null);
    if (!currentPassword || !newPassword) {
      setPasswordError('Заполните все поля.');
      setPasswordFlash('error');
      return;
    }
    if (newPassword !== newPassword2) {
      setPasswordError('Новый пароль и подтверждение не совпадают.');
      setPasswordFlash('error');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Пароль должен быть не короче 8 символов.');
      setPasswordFlash('error');
      return;
    }
    if (currentPassword === 'wrong') {
      setPasswordError('Неверный текущий пароль.');
      setPasswordFlash('error');
      return;
    }
    setPasswordFlash('saving');
    window.setTimeout(() => {
      setPasswordFlash('saved');
      setCurrentPassword('');
      setNewPassword('');
      setNewPassword2('');
    }, 450);
  }

  function openDelete() {
    setDeletePhase('confirm');
    setDeleteTyped('');
    setDeleteError(null);
  }

  function confirmDelete(event: FormEvent) {
    event.preventDefault();
    if (!deleteReady || deletePhase === 'deleting') return;
    setDeletePhase('deleting');
    setDeleteError(null);
    window.setTimeout(() => {
      // Mock: force error once if typed with trailing space attempt already blocked.
      if (deleteTyped !== DELETE_WORD) {
        setDeletePhase('error');
        setDeleteError('Подтверждение не совпало.');
        return;
      }
      setDeletePhase('done');
    }, 700);
  }

  function simulateDeleteError() {
    setDeletePhase('error');
    setDeleteError('Не удалось удалить аккаунт. Данные не изменены. Попробуйте позже.');
  }

  if (deletePhase === 'done') {
    return (
      <main className="app-shell account-proto">
        <div className="workspace account-proto-panel">
          <p className="brand brand-mark">
            Sign<span>et</span>
          </p>
          <h1 className="section-title">Аккаунт удалён</h1>
          <p className="lede">
            Сессия завершена. Визитки и публичные ссылки больше не открываются.
          </p>
          <p className="muted">
            Мок-прототип: реальный API не вызывался.
          </p>
          <div className="workspace-actions">
            <button
              type="button"
              className="button accent"
              onClick={() => applyScene('view')}
            >
              Сбросить прототип
            </button>
            <Link className="button secondary" href="/login">
              К экрану входа
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell account-proto">
      <div className="workspace">
        <header className="workspace-top">
          <div>
            <p className="brand brand-mark">
              Sign<span>et</span>
            </p>
            <p className="lede">Аккаунт (прототип на моках)</p>
            <p className="muted">Без реальных API-мутаций · T-017 Stage 2</p>
          </div>
          <div className="workspace-actions">
            <Link className="button secondary" href="/dashboard">
              Кабинет
            </Link>
          </div>
        </header>

        <nav className="account-proto-scenes" aria-label="Сценарии прототипа">
          {SCENES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={
                scene === item.id ? 'button accent' : 'button secondary'
              }
              onClick={() => applyScene(item.id)}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            className="button secondary"
            onClick={() => setAuthKind((k) => (k === 'password' ? 'vk' : 'password'))}
          >
            Режим: {authKind === 'password' ? 'password' : 'VK-only'}
          </button>
        </nav>

        <section className="account-proto-panel" aria-labelledby="account-profile-title">
          <h2 id="account-profile-title" className="section-title">
            Данные аккаунта
          </h2>
          <p className="muted">{loginLabel}</p>

          <form className="stack account-proto-form" onSubmit={onSaveName}>
            <label>
              E-mail
              <input
                value={email}
                readOnly
                aria-readonly="true"
              />
            </label>
            <p className="muted account-proto-hint">
              E-mail используется для входа и пока не меняется в кабинете.
            </p>

            <label>
              Имя аккаунта
              <input
                value={nameDraft}
                onChange={(event) => {
                  setNameDraft(event.target.value);
                  if (flash === 'saved') setFlash('idle');
                }}
                maxLength={120}
                autoComplete="nickname"
              />
            </label>
            <p className="muted account-proto-hint">
              Это имя в кабинете. Оно не меняет ФИО на визитках.
            </p>

            {saveError ? (
              <p className="error" role="alert">
                {saveError}
              </p>
            ) : null}
            {flash === 'saved' ? (
              <p className="account-proto-ok" role="status">
                Сохранено
              </p>
            ) : null}

            <div className="workspace-actions">
              <button
                type="submit"
                className="button accent"
                disabled={!dirty || !nameDraft.trim() || flash === 'saving'}
              >
                {flash === 'saving' ? 'Сохраняем…' : 'Сохранить'}
              </button>
              <button
                type="button"
                className="button secondary"
                disabled={!dirty || flash === 'saving'}
                onClick={onCancelName}
              >
                Отменить
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  if (dirty) setLeaveOpen(true);
                }}
              >
                Уйти с изменениями…
              </button>
            </div>
          </form>
        </section>

        {hasPassword ? (
          <section
            className="account-proto-panel"
            aria-labelledby="account-password-title"
          >
            <h2 id="account-password-title" className="section-title">
              Смена пароля
            </h2>
            <form className="stack account-proto-form" onSubmit={onSavePassword}>
              <label>
                Текущий пароль
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </label>
              <label>
                Новый пароль
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </label>
              <label>
                Подтверждение
                <input
                  type="password"
                  value={newPassword2}
                  onChange={(e) => setNewPassword2(e.target.value)}
                  autoComplete="new-password"
                />
              </label>
              {passwordError ? (
                <p className="error" role="alert">
                  {passwordError}
                </p>
              ) : null}
              {passwordFlash === 'saved' ? (
                <p className="account-proto-ok" role="status">
                  Пароль обновлён. Другие сессии завершены.
                </p>
              ) : null}
              <div className="workspace-actions">
                <button
                  type="submit"
                  className="button accent"
                  disabled={passwordFlash === 'saving'}
                >
                  {passwordFlash === 'saving' ? 'Сохраняем…' : 'Сменить пароль'}
                </button>
              </div>
              <p className="muted account-proto-hint">
                Подсказка мока: текущий пароль `wrong` покажет ошибку.
              </p>
            </form>
          </section>
        ) : (
          <section className="account-proto-panel">
            <h2 className="section-title">Смена пароля</h2>
            <p className="muted">
              Для входа через VK ID пароль в Signet не задан — смена пароля
              недоступна.
            </p>
          </section>
        )}

        <section
          className="account-proto-panel is-danger"
          aria-labelledby="account-delete-title"
        >
          <h2 id="account-delete-title" className="section-title">
            Удаление аккаунта
          </h2>
          <p>Удаление необратимо. Аккаунт станет недоступен.</p>

          {deletePhase === 'idle' ? (
            <button type="button" className="button danger" onClick={openDelete}>
              Удалить аккаунт…
            </button>
          ) : null}

          {deletePhase === 'confirm' || deletePhase === 'error' ? (
            <form
              className="stack account-proto-form"
              onSubmit={confirmDelete}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
                  if (event.target.name !== 'deleteConfirm') {
                    event.preventDefault();
                  }
                }
              }}
            >
              <label>
                Чтобы подтвердить, введите «{DELETE_WORD}»
                <input
                  name="deleteConfirm"
                  value={deleteTyped}
                  onChange={(e) => setDeleteTyped(e.target.value)}
                  autoComplete="off"
                  aria-describedby="delete-confirm-help"
                />
              </label>
              <p id="delete-confirm-help" className="muted account-proto-hint">
                Регистр и пробелы учитываются. Кнопка активна только при точном
                совпадении.
              </p>
              {deleteError ? (
                <p className="error" role="alert">
                  {deleteError}
                </p>
              ) : null}
              <div className="workspace-actions">
                <button
                  type="submit"
                  className="button danger"
                  disabled={!deleteReady}
                >
                  Удалить навсегда
                </button>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    setDeletePhase('idle');
                    setDeleteTyped('');
                    setDeleteError(null);
                  }}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  className="button secondary"
                  onClick={simulateDeleteError}
                >
                  Симулировать ошибку
                </button>
              </div>
            </form>
          ) : null}

          {deletePhase === 'deleting' ? (
            <p className="lede" role="status">
              Удаляем аккаунт…
            </p>
          ) : null}
        </section>
      </div>

      {leaveOpen ? (
        <div
          className="account-proto-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-title"
        >
          <div className="account-proto-modal-card">
            <h2 id="leave-title">Уйти без сохранения?</h2>
            <p>Несохранённое имя аккаунта будет потеряно.</p>
            <div className="workspace-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setLeaveOpen(false)}
              >
                Остаться
              </button>
              <button
                type="button"
                className="button accent"
                onClick={() => {
                  onCancelName();
                  setLeaveOpen(false);
                }}
              >
                Уйти
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
