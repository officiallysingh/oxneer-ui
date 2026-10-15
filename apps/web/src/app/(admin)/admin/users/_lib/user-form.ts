import type { UserCreationReq, UserDetailVM, UserUpdateReq } from '@repo/api';
import { MOBILE_ERROR, MOBILE_PATTERN, USERNAME_ERROR, USERNAME_PATTERN } from '@/lib/validation';

export type UserFormMode = 'create' | 'edit';

export interface UserFormValues {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  profilePicture: string | undefined;
  enabled: boolean;
  askToVerifyEmail: boolean;
  askToVerifyMobile: boolean;
  promptChangePwd: boolean;
  roles: string[];
  permissions: string[];
}

export type UserFormField = keyof UserFormValues;
export type UserFormErrors = Partial<Record<UserFormField, string>>;
export type UserFormTextField = 'username' | 'firstName' | 'lastName' | 'email' | 'mobile';

/** DOM id of a field's input; its wrapper is `${fieldId(f)}-field`. */
export const fieldId = (field: UserFormField) => `user-${field}`;

export const EMPTY_USER_FORM: UserFormValues = {
  username: '',
  firstName: '',
  lastName: '',
  email: '',
  mobile: '',
  profilePicture: undefined,
  enabled: true,
  askToVerifyEmail: true,
  askToVerifyMobile: false,
  promptChangePwd: true,
  roles: [],
  permissions: [],
};

export const FIELD_LABELS: Record<UserFormField, string> = {
  username: 'Username',
  firstName: 'First name',
  lastName: 'Last name',
  email: 'Email',
  mobile: 'Mobile',
  profilePicture: 'Photo',
  enabled: 'Enabled',
  askToVerifyEmail: 'Ask to verify email',
  askToVerifyMobile: 'Ask to verify mobile',
  promptChangePwd: 'Prompt password change',
  roles: 'Roles',
  permissions: 'Additional permissions',
};

/** Order fields appear in the form — used to order error summaries. */
const FIELD_ORDER: UserFormField[] = [
  'firstName',
  'lastName',
  'username',
  'email',
  'mobile',
  'roles',
  'permissions',
];

/** API constraint-violation property → form field. */
const API_FIELD_MAP: Record<string, UserFormField> = {
  username: 'username',
  firstName: 'firstName',
  lastName: 'lastName',
  emailId: 'email',
  mobileNo: 'mobile',
  profilePicture: 'profilePicture',
  roles: 'roles',
  permissions: 'permissions',
};

export function userToFormValues(u: UserDetailVM): UserFormValues {
  return {
    username: u.username ?? '',
    firstName: u.firstName ?? '',
    lastName: u.lastName ?? '',
    email: u.emailId ?? '',
    mobile: u.mobileNo ?? '',
    profilePicture: u.profilePicture ?? undefined,
    enabled: u.enabled,
    askToVerifyEmail: !u.emailIdVerified,
    askToVerifyMobile: !u.mobileNoVerified,
    promptChangePwd: u.promptChangePassword,
    roles: (u.roles ?? []).map((r) => r.id),
    permissions: (u.permissions ?? []).map((p) => p.id),
  };
}

export function toCreatePayload(v: UserFormValues): UserCreationReq {
  return {
    username: v.username.trim(),
    emailId: v.email.trim(),
    firstName: v.firstName.trim(),
    lastName: v.lastName.trim(),
    mobileNo: v.mobile.trim() || undefined,
    profilePicture: v.profilePicture,
    enabled: v.enabled,
    emailIdVerified: !v.askToVerifyEmail,
    mobileNoVerified: !v.askToVerifyMobile,
    credentialsNonExpired: !v.promptChangePwd,
    promptChangePassword: v.promptChangePwd,
    accountNonLocked: true,
    accountNonExpired: true,
    roles: v.roles.length ? v.roles : undefined,
    permissions: v.permissions.length ? v.permissions : undefined,
  };
}

function sameSet(a: string[], b: string[]) {
  return a.length === b.length && a.every((x) => b.includes(x));
}

function isFieldChanged(field: UserFormField, v: UserFormValues, o: UserFormValues) {
  const a = v[field];
  const b = o[field];
  if (Array.isArray(a) && Array.isArray(b)) return !sameSet(a, b);
  if (typeof a === 'string' && typeof b === 'string') return a.trim() !== b.trim();
  return a !== b;
}

export function changedFields(v: UserFormValues, original: UserFormValues): UserFormField[] {
  return (Object.keys(v) as UserFormField[]).filter((f) => isFieldChanged(f, v, original));
}

/** PATCH body containing only what changed. */
export function toUpdatePatch(v: UserFormValues, original: UserFormValues): UserUpdateReq {
  const changed = new Set(changedFields(v, original));
  const patch: UserUpdateReq = {};
  if (changed.has('email')) patch.emailId = v.email.trim();
  if (changed.has('firstName')) patch.firstName = v.firstName.trim();
  if (changed.has('lastName')) patch.lastName = v.lastName.trim();
  if (changed.has('mobile')) patch.mobileNo = v.mobile.trim() || undefined;
  if (changed.has('profilePicture')) patch.profilePicture = v.profilePicture ?? null;
  if (changed.has('enabled')) patch.enabled = v.enabled;
  if (changed.has('askToVerifyEmail')) patch.emailIdVerified = !v.askToVerifyEmail;
  if (changed.has('askToVerifyMobile')) patch.mobileNoVerified = !v.askToVerifyMobile;
  if (changed.has('promptChangePwd')) patch.credentialsNonExpired = !v.promptChangePwd;
  if (changed.has('roles')) patch.roles = v.roles;
  if (changed.has('permissions')) patch.permissions = v.permissions;
  return patch;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateUserForm(v: UserFormValues, mode: UserFormMode): UserFormErrors {
  const errors: UserFormErrors = {};
  if (!v.firstName.trim()) errors.firstName = 'First name is required';
  if (!v.lastName.trim()) errors.lastName = 'Last name is required';
  if (mode === 'create') {
    if (!v.username.trim()) errors.username = 'Username is required';
    else if (!USERNAME_PATTERN.test(v.username.trim())) errors.username = USERNAME_ERROR;
  }
  if (!v.email.trim()) errors.email = 'Email is required';
  else if (!EMAIL_PATTERN.test(v.email.trim()))
    errors.email = 'Enter a valid email, like name@example.com';
  if (v.mobile.trim() && !MOBILE_PATTERN.test(v.mobile.trim())) errors.mobile = MOBILE_ERROR;
  return errors;
}

/** Maps API violation keys (emailId, mobileNo…) onto form fields. */
export function mapApiFieldErrors(apiErrors: Record<string, string>): UserFormErrors {
  const errors: UserFormErrors = {};
  for (const [key, message] of Object.entries(apiErrors)) {
    const field = API_FIELD_MAP[key];
    if (field) errors[field] = message;
  }
  return errors;
}

/** Errors in form order, shaped for `FormErrorSummary`. */
export function orderedErrors(errors: UserFormErrors) {
  return FIELD_ORDER.filter((f) => errors[f]).map((f) => ({
    fieldId: `${fieldId(f)}-field`,
    label: FIELD_LABELS[f],
    message: errors[f]!,
  }));
}

/** A few valid usernames built from the person's name. */
export function suggestUsernames(firstName: string, lastName: string): string[] {
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
  const f = clean(firstName);
  const l = clean(lastName);
  if (!f) return [];
  const candidates = l ? [`${f}.${l}`, `${f[0]}${l}`, `${f}${l[0]}`, `${f}.${l[0]}`] : [f];
  return [...new Set(candidates)].filter((c) => USERNAME_PATTERN.test(c));
}
