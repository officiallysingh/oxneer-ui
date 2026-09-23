import Link from 'next/link';
import { AuthForm } from '@/components/auth/AuthForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui';
import { AuthIllustration } from '@/components/auth/AuthIllustration';

export default function SignupPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12">
          <AuthIllustration />
          <div className="text-center mt-8 max-w-md">
            <h2 className="text-3xl font-bold text-primary-foreground mb-4 text-balance">
              Join Oxneer auctions
            </h2>
            <p className="text-primary-foreground/80 text-lg leading-relaxed">
              Create an account to browse auctions, accept invitations, and complete participation
              workflows.
            </p>
          </div>
        </div>
        {/* Decorative circles */}
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary-foreground/5" />
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-primary-foreground/5" />
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xl">O</span>
              </div>
              <span className="text-xl font-bold text-foreground">Oxneer</span>
            </Link>
          </div>

          <Card className="border-0 shadow-xl">
            <CardHeader className="space-y-1 text-center pb-4">
              <div className="hidden lg:flex justify-center mb-4">
                <Link href="/" className="inline-flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-xl">O</span>
                  </div>
                  <span className="text-xl font-bold text-foreground">Oxneer</span>
                </Link>
              </div>
              <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
              <CardDescription>Create an account to join auctions and workflows</CardDescription>
            </CardHeader>
            <CardContent>
              <AuthForm mode="signup" />
              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">Already have an account? </span>
                <Link
                  href="/login"
                  className="font-medium text-primary hover:text-primary/90 transition-colors"
                >
                  Sign in
                </Link>
              </div>
            </CardContent>
          </Card>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            By continuing, you agree to use Oxneer in accordance with your organization&apos;s
            policies.
          </p>
        </div>
      </div>
    </div>
  );
}
