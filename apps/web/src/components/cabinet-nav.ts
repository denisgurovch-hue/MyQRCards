/** Shared cabinet IA helpers (T-022). Hub = `/dashboard`. */

export const CABINET_HUB_HREF = '/dashboard' as const;

export type CabinetNavContext =
  | 'dashboard'
  | 'edit'
  | 'present'
  | 'account'
  | 'admin';

export type CabinetChromeActions = {
  /** Signet always navigates to hub. */
  brandLinksToDashboard: true;
  /** Primary escape on create/edit-v2. */
  showBackToCards: boolean;
  /** Create CTA — list only. */
  showCreate: boolean;
  /** Card lifecycle sheet — reserved; edit chrome no longer shows Управление. */
  showManage: boolean;
  /** Admin entry — allowlisted users, list only. */
  showAdmin: boolean;
  /** Account entry — list only. */
  showAccount: boolean;
  /** «Кабинет» back link — account/admin. */
  showCabinet: boolean;
  /** Logout — dashboard and admin. */
  showLogout: boolean;
};

export function cabinetChromeActions(
  context: CabinetNavContext,
  opts: { isAdmin?: boolean } = {},
): CabinetChromeActions {
  const isAdmin = Boolean(opts.isAdmin);
  return {
    brandLinksToDashboard: true,
    showBackToCards: context === 'edit',
    showCreate: context === 'dashboard',
    showManage: false,
    showAdmin: context === 'dashboard' && isAdmin,
    showAccount: context === 'dashboard',
    showCabinet: context === 'account' || context === 'admin',
    showLogout: context === 'dashboard' || context === 'admin',
  };
}
