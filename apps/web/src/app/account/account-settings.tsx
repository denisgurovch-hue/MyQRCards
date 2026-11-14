'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { apiFetch } from '../../lib/api';

export type AccountUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  hasPassword: boolean;
};

const DELETE_WORD = 'Удалить';

type Flash = 'idle' | 'saving' | 'saved' | 'error';
type DeletePhase = 'idle' | 'confirm' | 'deleting';

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function AccountSettings({ user }: { user: AccountUser }) {
  const router = useRouter();

  const [baselineName, setBaselineName] = useState(user.displayName ?? '');
  const [nameDraft, setNameDraft] = useState(user.displayName ?? '');
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
  const deleteReady = deleteTyped === DELETE_WORD;
  const loginLabel = user.hasPassword
    ? 'Вход по e-mail и паролю'
    : 'Вход через VK ID';

  async function onSaveName(event: FormEvent) {
    event.preventDefault();
    const next = nameDraft.trim();
    if (!next || flash === 'saving') return;
    setFlash('saving');
    setSaveError(null);
    try {
      const res = await apiFetch<{ user: AccountUser }>('/api/v1/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ displayName: next }),
      });
      setBaselineName(res.user.displayName ?? '');
      setNameDraft(res.user.displayName ?? '');
      setFlash('saved');
      router.refresh();
    } catch (error) {
      setFlash('error');
      setSaveError(errorMessage(error, 'Не удалось сохранить имя'));
    }
  }

  function onCancelName() {
    setNameDraft(baselineName);
    setSaveError(null);
    setFlash('idle');
  }

  async function onSavePassword(event: FormEvent) {
    event.preventDefault();
    if (!user.hasPassword || passwordFlash === 'saving') return;
    if (newPassword !== newPassword2) {
      setPasswordError('Пароли не совпадают');
      setPasswordFlash('error');
      return;
    }
    setPasswordFlash('saving');
    setPasswordError(null);
    try {
      await apiFetch('/api/v1/auth/password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      setCurrentPassword('');
      setNewPassword('');
      setNewPassword2('');
      setPasswordFlash('saved');
    } catch (error) {
      setPasswordFlash('error');
      setPasswordError(errorMessage(error, 'Не удалось сменить пароль'));
    }
  }

  async function confirmDelete(event: FormEvent) {
    event.preventDefault();
    if (!deleteReady || deletePhase === 'deleting') return;
    setDeletePhase('deleting');
    setDeleteError(null);
    try {
      await apiFetch('/api/v1/auth/account/delete', {
        method: 'POST',
        body: JSON.stringify({ confirmation: DELETE_WORD }),
      });
      router.push('/login');
      router.refresh();
    } catch (error) {
      setDeletePhase('confirm');
      setDeleteError(errorMessage(error, 'Не удалось удалить аккаунт'));
    }
  }

  return (
    <main className="app-shell account-proto">
      <div className="workspace">
        <header className="workspace-top">
          <div>
            <p className="brand brand-mark">
              Sign<span>et</span>
            </p>
            <p className="lede">Аккаунт</p>
          </div>
          <div className="workspace-actions">
            <Link
              className="button secondary"
              href="/dashboard"
              onClick={(event) => {
                if (!dirty) return;
                event.preventDefault();
                setLeaveOpen(true);
              }}
            >
              Кабинет
            </Link>
          </div>
        </header>

        <section
          className="account-proto-panel"
          aria-labelledby="account-profile-title"
        >
          <h2 id="account-profile-title" className="section-title">
            Данные аккаунта
          </h2>
          <p className="muted">{loginLabel}</p>

          <form className="stack account-proto-form" onSubmit={onSaveName}>
            <label>
              E-mail
              <input value={user.email ?? ''} readOnly aria-readonly="true" />
            </label>

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
            </div>
          </form>
        </section>

        {user.hasPassword ? (
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
                  minLength={8}
                />
              </label>
              <label>
                Подтверждение
                <input
                  type="password"
                  value={newPassword2}
                  onChange={(e) => setNewPassword2(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                />
              </label>
              {passwordError ? (
                <p className="error" role="alert">
                  {passwordError}
                </p>
              ) : null}
              {passwordFlash === 'saved' ? (
                <p className="account-proto-ok" role="status">
                  Пароль обновлён
                </p>
              ) : null}
              <div className="workspace-actions">
                <button
                  type="submit"
                  className="button accent"
                  disabled={
                    passwordFlash === 'saving' ||
                    !currentPassword ||
                    !newPassword ||
                    !newPassword2
                  }
                >
                  {passwordFlash === 'saving' ? 'Сохраняем…' : 'Сменить пароль'}
                </button>
              </div>
            </form>
          </section>
        ) : null}

        <section
          className="account-proto-panel is-danger"
          aria-labelledby="account-delete-title"
        >
          <h2 id="account-delete-title" className="section-title">
            Удаление аккаунта
          </h2>
          <p>Удаление необратимо. Аккаунт станет недоступен.</p>

          {deletePhase === 'idle' ? (
            <button
              type="button"
              className="button danger"
              onClick={() => {
                setDeletePhase('confirm');
                setDeleteTyped('');
                setDeleteError(null);
              }}
            >
              Удалить аккаунт…
            </button>
          ) : null}

          {deletePhase === 'confirm' ? (
            <form
              className="stack account-proto-form"
              onSubmit={confirmDelete}
              onKeyDown={(event) => {
                if (
                  event.key === 'Enter' &&
                  event.target instanceof HTMLInputElement &&
                  event.target.name !== 'deleteConfirm'
                ) {
                  event.preventDefault();
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
            <h2 id="leave-title">Данные не сохранены. Закрыть?</h2>
            <p>Несохранённые изменения имени будут потеряны.</p>
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
                  router.push('/dashboard');
                }}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
