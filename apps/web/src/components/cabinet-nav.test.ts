import { describe, expect, it } from 'vitest';
import {
  CABINET_HUB_HREF,
  cabinetChromeActions,
  type CabinetNavContext,
} from './cabinet-nav';

const CONTEXTS: CabinetNavContext[] = [
  'dashboard',
  'edit',
  'present',
  'account',
  'admin',
];

describe('cabinetChromeActions (T-022)', () => {
  it('hub href is /dashboard', () => {
    expect(CABINET_HUB_HREF).toBe('/dashboard');
  });

  it('brand always links to dashboard', () => {
    for (const context of CONTEXTS) {
      expect(cabinetChromeActions(context).brandLinksToDashboard).toBe(true);
    }
  });

  it('shows Создать only on dashboard', () => {
    expect(cabinetChromeActions('dashboard').showCreate).toBe(true);
    for (const context of CONTEXTS.filter((c) => c !== 'dashboard')) {
      expect(cabinetChromeActions(context).showCreate).toBe(false);
    }
  });

  it('shows Управление and К визиткам only on edit', () => {
    const edit = cabinetChromeActions('edit');
    expect(edit.showManage).toBe(true);
    expect(edit.showBackToCards).toBe(true);
    for (const context of CONTEXTS.filter((c) => c !== 'edit')) {
      const actions = cabinetChromeActions(context);
      expect(actions.showManage).toBe(false);
      expect(actions.showBackToCards).toBe(false);
    }
  });

  it('shows Админ only on dashboard when allowlisted', () => {
    expect(cabinetChromeActions('dashboard', { isAdmin: true }).showAdmin).toBe(
      true,
    );
    expect(cabinetChromeActions('dashboard', { isAdmin: false }).showAdmin).toBe(
      false,
    );
    expect(cabinetChromeActions('admin', { isAdmin: true }).showAdmin).toBe(
      false,
    );
    expect(cabinetChromeActions('edit', { isAdmin: true }).showAdmin).toBe(
      false,
    );
  });

  it('shows Аккаунт only on dashboard', () => {
    expect(cabinetChromeActions('dashboard').showAccount).toBe(true);
    expect(cabinetChromeActions('account').showAccount).toBe(false);
  });

  it('shows Кабинет on account and admin only', () => {
    expect(cabinetChromeActions('account').showCabinet).toBe(true);
    expect(cabinetChromeActions('admin').showCabinet).toBe(true);
    expect(cabinetChromeActions('dashboard').showCabinet).toBe(false);
    expect(cabinetChromeActions('edit').showCabinet).toBe(false);
    expect(cabinetChromeActions('present').showCabinet).toBe(false);
  });

  it('shows Logout on dashboard and admin', () => {
    expect(cabinetChromeActions('dashboard').showLogout).toBe(true);
    expect(cabinetChromeActions('admin').showLogout).toBe(true);
    expect(cabinetChromeActions('account').showLogout).toBe(false);
    expect(cabinetChromeActions('edit').showLogout).toBe(false);
  });

  it('present has no list/edit chrome actions', () => {
    const present = cabinetChromeActions('present', { isAdmin: true });
    expect(present.showCreate).toBe(false);
    expect(present.showManage).toBe(false);
    expect(present.showAdmin).toBe(false);
    expect(present.showAccount).toBe(false);
    expect(present.showCabinet).toBe(false);
    expect(present.showLogout).toBe(false);
    expect(present.showBackToCards).toBe(false);
  });
});
