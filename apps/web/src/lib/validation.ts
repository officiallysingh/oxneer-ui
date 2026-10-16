/**
 * Client-side validation patterns mirroring the backend
 * `com.neolama.oxneer.common.core.RegularExpressions` class.
 *
 * Keep these in sync with the backend whenever the server-side patterns change.
 * IFSC / Bank Account patterns live in `@repo/api` (bankDetails.ts) and are
 * re-exported here for convenience.
 */

// ── Re-exports from @repo/api so consumers need only one import ───────────────
export { IFSC_REGEX, ACCOUNT_NO_REGEX } from '@repo/api';

export const IFSC_TIP = 'Format: 4 letters + 0 + 6 alphanumeric · e.g. ICIC0000733';
export const ACCOUNT_NO_TIP = '9–18 digit bank account number · e.g. 123456789012';

// ── General ───────────────────────────────────────────────────────────────────
export const ALPHABETS_PATTERN = /^[a-zA-Z]*$/;
export const ALPHABETS_AND_SPACES_PATTERN = /^[a-zA-Z ]+$/;
export const ALPHA_NUMERIC_PATTERN = /^[A-Za-z0-9]+$/;
export const ALPHA_NUMERIC_CAPITAL_PATTERN = /^[A-Z0-9]+$/;
export const PERSON_NAME_PATTERN = /^[A-Za-z]+(?: [A-Za-z]+)*$/;

// ── Mobile ────────────────────────────────────────────────────────────────────
/** Indian mobile: starts with 6-9, followed by exactly 9 digits. */
export const MOBILE_PATTERN = /^[6-9]\d{9}$/;
export const MOBILE_ERROR = 'Enter a valid 10-digit Indian mobile number.';
export const MOBILE_TIP = 'Indian mobile: starts with 6-9, followed by 9 digits · e.g. 9876543210';

// ── PAN ───────────────────────────────────────────────────────────────────────
export const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
export const PAN_ERROR = 'Enter a valid PAN (e.g. ABCDE1234F).';

// ── Master data ───────────────────────────────────────────────────────────────
export const STATE_NAME_PATTERN = /^[a-zA-Z ]+$/;
export const STATE_CODE_PATTERN = /^[A-Z]{2}$/;
export const CITY_NAME_PATTERN = /^[\p{L}0-9 .,&()-]+$/u;
export const AREA_NAME_PATTERN = /^[\p{L}\d .,&()'()/-]+$/u;
export const AREA_PIN_CODE_PATTERN = /^[1-9]{1}[0-9]{2}\s{0,1}[0-9]{3}$/;

export const STATE_NAME_ERROR = 'Only letters and spaces are allowed.';
export const STATE_CODE_ERROR = 'Enter exactly 2 uppercase letters (e.g. MH).';
export const STATE_NAME_TIP = 'Letters and spaces only · e.g. Maharashtra, Tamil Nadu';
export const STATE_CODE_TIP = 'Exactly 2 uppercase letters · e.g. MH, TN, DL';

export const CITY_NAME_ERROR = 'Only letters, numbers, spaces and . , & ( ) - are allowed.';
export const CITY_NAME_TIP = 'Letters, numbers, spaces and . , & ( ) - · e.g. Mumbai, Navi Mumbai';

export const AREA_NAME_ERROR = "Only letters, numbers, spaces and . , & ( ) ' / - are allowed.";
export const AREA_PIN_CODE_ERROR = 'Enter a valid 6-digit pin code.';
export const AREA_NAME_TIP =
  "Letters, numbers, spaces and . , & ( ) ' / - · e.g. Andheri, Bandra-West";
export const AREA_PIN_CODE_TIP = '6-digit Indian PIN code · cannot start with 0 · e.g. 400058';

// ── Role ──────────────────────────────────────────────────────────────────────
/**
 * Role names are lowercase, dot-separated system keys, e.g. `master.data.categories.admin`.
 */
export const ROLE_NAME_PATTERN = /^[a-z0-9]+(?:\.[a-z0-9]+)*$/;
export const ROLE_NAME_ERROR = 'Use lowercase letters, numbers and dots, like auction.manager';
export const ROLE_NAME_TIP =
  'Lowercase letters, numbers and dots (e.g. auction.manager). Used by the system.';

// ── Permission label ──────────────────────────────────────────────────────────
export const PERMISSION_LABEL_PATTERN = /^[a-zA-Z.\-&()]+$/;
export const PERMISSION_LABEL_ERROR = 'Only letters, dot, dash, & and ( ) are allowed.';

// ── Username ──────────────────────────────────────────────────────────────────
/**
 * Backend pattern:
 *   ^(?=.{2,100}$)(?!\d)(?=[a-z0-9._]*$)(?!.*\..*\.)(?!.*_.*_)[a-z][a-z0-9._]*$
 *
 * Rules:
 * - 2–100 characters
 * - Lowercase letters and digits only (plus . and _)
 * - Cannot start with a digit
 * - At most one dot and one underscore
 */
export const USERNAME_PATTERN =
  /^(?=.{2,100}$)(?!\d)(?=[a-z0-9._]*$)(?!.*\..*\.)(?!.*_.*_)[a-z][a-z0-9._]*$/;
export const USERNAME_RULES =
  '2–100 characters · lowercase letters and digits only · cannot start with a digit · at most one dot (.) and one underscore (_)';
export const USERNAME_ERROR =
  'Username must be 2–100 lowercase characters, no leading digit, at most one dot and one underscore.';

// ── Password ──────────────────────────────────────────────────────────────────
/**
 * Backend pattern:
 *   ^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)[A-Za-z\d@$!%*?&^]{6,12}$
 *
 * Rules:
 * - 6–12 characters
 * - At least 1 uppercase, 1 lowercase, 1 digit
 * - Allowed special characters: @ $ ! % * ? & ^
 */
export const PASSWORD_PATTERN = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)[A-Za-z\d@$!%*?&^]{6,12}$/;
export const PASSWORD_RULES =
  '6–12 characters · at least 1 uppercase · 1 lowercase · 1 digit · allowed special: @ $ ! % * ? & ^';
export const PASSWORD_ERROR =
  'Password must be 6–12 characters with at least 1 uppercase, 1 lowercase, and 1 digit.';
