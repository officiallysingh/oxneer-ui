import Link from 'next/link';
import { BrandLogo } from '@/components/common/BrandLogo';
import { AuthForm } from '@/components/auth/AuthForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@oxneer/ui';
import { AuthSidePanel } from '@/components/auth/AuthSidePanel';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      <AuthSidePanel
        title="Welcome back to Oxneer"
        description="Sign in to manage auctions, complete workflows, and participate in live bidding."
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
              <CardTitle className="text-2xl font-bold">Sign in to your account</CardTitle>
              <CardDescription>Choose your preferred sign-in method below</CardDescription>
            </CardHeader>
            <CardContent>
              <AuthForm mode="login" />
              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">{"Don't have an account? "}</span>
                <Link
                  href="/signup"
                  className="font-medium text-primary hover:text-primary/90 transition-colors"
                >
                  Register
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
