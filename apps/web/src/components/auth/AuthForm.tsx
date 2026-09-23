'use client';

import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';

interface AuthFormProps {
  mode: 'login' | 'signup';
}

/** Routes to the login or signup wizard. */
export function AuthForm({ mode }: AuthFormProps) {
  return mode === 'login' ? <LoginForm /> : <SignupForm />;
}
