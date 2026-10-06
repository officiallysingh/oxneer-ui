'use client';

import { useEffect, useState } from 'react';

export function useResendCooldown() {
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  return { resendCooldown, setResendCooldown };
}
