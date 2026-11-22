'use client';

import { Shield, Users, Zap, Lock } from 'lucide-react';

export function AuthIllustration() {
  return (
    <div className="relative w-full max-w-sm">
      {/* Main illustration container */}
      <div className="relative">
        {/* Central card */}
        <div className="bg-primary-foreground/10 backdrop-blur-xs rounded-2xl p-8 border border-primary-foreground/20">
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-primary-foreground/20 flex items-center justify-center">
              <Shield className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>

          {/* Feature cards */}
          <div className="space-y-4">
            <div className="flex items-center gap-4 bg-primary-foreground/10 rounded-xl p-4">
              <div className="w-10 h-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-primary-foreground font-medium text-sm">Secure Access</p>
                <p className="text-primary-foreground/70 text-xs">End-to-end encryption</p>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-primary-foreground/10 rounded-xl p-4">
              <div className="w-10 h-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-primary-foreground font-medium text-sm">Lightning Fast</p>
                <p className="text-primary-foreground/70 text-xs">Instant authentication</p>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-primary-foreground/10 rounded-xl p-4">
              <div className="w-10 h-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-primary-foreground font-medium text-sm">Team Ready</p>
                <p className="text-primary-foreground/70 text-xs">Collaborate seamlessly</p>
              </div>
            </div>
          </div>
        </div>

        {/* Floating elements */}
        <div className="absolute -top-4 -right-4 w-16 h-16 rounded-xl bg-primary-foreground/10 backdrop-blur-xs border border-primary-foreground/20 flex items-center justify-center animate-pulse">
          <div className="w-8 h-8 rounded-lg bg-primary-foreground/30" />
        </div>
        <div className="absolute -bottom-4 -left-4 w-12 h-12 rounded-full bg-primary-foreground/10 backdrop-blur-xs border border-primary-foreground/20" />
      </div>
    </div>
  );
}
