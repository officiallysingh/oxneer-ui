import {
  API_BASE,
  SESSION_ERROR_KEY,
  apiClient,
  clearSessionError,
  getApiErrorMessage,
} from './client';

export interface LoginParams {
  username: string;
  password?: string;
}

export interface LoginResponse {
  authenticated: boolean;
  promptChangePassword: boolean;
  authenticationMode: string;
  username: string;
  roles?: string[] | { authority: string }[];
}

export interface VerifyOtpParams {
  username: string;
  code: string;
  purpose: 'LOGIN' | 'PASSWORD_RESET' | 'EMAIL_VERIFICATION' | 'MOBILE_VERIFICATION';
}

/** Request body for POST /api/v1/users/register (backend expects emailId). */
export interface SignupParams {
  username: string;
  emailId: string;
  firstName: string;
  lastName: string;
  mobileNo: string;
  password?: string;
  profilePicture?: string | null;
}

export interface SendOtpParams {
  username: string;
  purpose: 'LOGIN' | 'PASSWORD_RESET' | 'EMAIL_VERIFICATION' | 'MOBILE_VERIFICATION';
}

export const authApi = {
  login: async (data: LoginParams) => {
    const params = new URLSearchParams();
    params.append('username', data.username);
    if (data.password) {
      params.append('password', data.password);
    }
    const response = await apiClient.post<LoginResponse>('/login', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },

  signup: async (data: SignupParams) => {
    const response = await apiClient.post('/api/v1/users/register', data);
    return response.data;
  },

  /** Generate OTP: POST /api/v1/verification-codes/generate with { subject } (email or mobile). */
  sendOtp: async (data: SendOtpParams) => {
    const response = await apiClient.post('/api/v1/verification-codes/generate', {
      subject: data.username,
    });
    return response.data;
  },

  /** Verify OTP: POST /api/v1/verification-codes/verify with { subject, code }. */
  verifyOtp: async (data: VerifyOtpParams) => {
    const response = await apiClient.post('/api/v1/verification-codes/verify', {
      subject: data.username,
      code: data.code,
    });
    return response.data;
  },

  /** Change password (session required). */
  changePassword: async (data: { currentPassword: string; newPassword: string }) => {
    const response = await apiClient.post('/api/v1/users/me/change-password', data);
    return response.data;
  },

  /** Invalidate the server session — POST /logout (Spring Security default endpoint). */
  logout: async (): Promise<void> => {
    const response = await fetch(`${API_BASE}/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json, text/plain, */*' },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      let error: unknown;
      try {
        error = { response: { status: response.status, data: body ? JSON.parse(body) : body } };
      } catch {
        error = { response: { status: response.status, data: body } };
      }
      const message = getApiErrorMessage(error, `Logout failed (HTTP ${response.status}).`);
      // An expired session answers 401/403 — keep the message so the login page can show it.
      if (response.status === 401 || response.status === 403) {
        try {
          window.sessionStorage.setItem(SESSION_ERROR_KEY, message);
        } catch {
          /* ignore */
        }
      }
      throw new Error(message);
    }

    clearSessionError();
  },
};
