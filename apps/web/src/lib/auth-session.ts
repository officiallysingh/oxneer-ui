import { usersApi, type LoginResponse, type UserInfo } from '@repo/api';
import type { AuthUser } from '@/store/authStore';

const ADMIN_PERMISSIONS = new Set(['superadmin', 'ROLE_SUPERADMIN', 'platform.superadmin']);

export function isAdminUserInfo(userInfo: UserInfo): boolean {
  return !!userInfo.permissions?.some((a) => ADMIN_PERMISSIONS.has(a));
}

/** Map a login API response to the persisted auth user shape. */
export function authUserFromLoginResponse(data: LoginResponse): AuthUser {
  return {
    username: data.username,
    authenticated: data.authenticated,
    roles: data.roles
      ? Array.isArray(data.roles)
        ? data.roles.map((r) => (typeof r === 'string' ? { authority: r } : r))
        : []
      : undefined,
  };
}

/** Decide where to send the user immediately after a successful sign-in. */
export function resolvePostLoginRedirect(userInfo: UserInfo, callbackUrl?: string | null): string {
  if (userInfo.promptChangePassword) return '/change-password';
  if (!userInfo.emailIdVerified || !userInfo.mobileNoVerified) return '/verify';
  if (callbackUrl) return callbackUrl;
  return isAdminUserInfo(userInfo) ? '/admin/users' : '/';
}

/**
 * Persist auth state and load the current user's profile.
 * Used after password login, OTP login, and OIDC completion.
 */
export async function establishAuthSession(
  setUser: (user: AuthUser) => void,
  setUserInfo: (info: UserInfo | null) => void,
  user: AuthUser,
  callbackUrl?: string | null,
): Promise<{ userInfo: UserInfo; redirectPath: string }> {
  setUser(user);
  const userInfo = await usersApi.getSelfInfo();
  setUserInfo(userInfo);
  return {
    userInfo,
    redirectPath: resolvePostLoginRedirect(userInfo, callbackUrl),
  };
}
