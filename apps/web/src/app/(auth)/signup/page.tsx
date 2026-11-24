import Link from 'next/link';
import { BrandLogo } from '@/components/common/BrandLogo';
import { AuthForm } from '@/components/auth/AuthForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@oxneer/ui';
import { AuthSidePanel } from '@/components/auth/AuthSidePanel';

export default function SignupPage() {
  return (
    <div className="min-h-screen flex">
      <AuthSidePanel
        title="Join Oxneer auctions"
        description="Create an account to browse auctions, accept invitations, and complete participation workflows."
      />

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 lg:hidden">
            <Link href="/" className="inline-flex items-center mb-6">
              <BrandLogo className="h-9" />
            </Link>
          </div>

          <Card className="border-0 shadow-xl">
            <CardHeader className="space-y-1 text-center pb-4">
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
