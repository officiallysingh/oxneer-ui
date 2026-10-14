import { test, expect } from '@playwright/test';

const PROBLEM_403 = JSON.stringify({
  type: 'about:blank',
  status: 403,
  instance: '/api/v1/auctions',
  method: 'GET',
  code: 'authorization-denied',
  title: 'Forbidden',
  detail: 'Access Denied',
  timestamp: '2026-10-10T15:00:00Z',
});

const seedSignedInUser = (context: import('@playwright/test').BrowserContext) =>
  context.addInitScript(() => {
    window.localStorage.setItem(
      'auth-store',
      JSON.stringify({
        state: {
          user: {
            username: 'superadmin',
            roles: [{ authority: 'superadmin' }],
            authenticated: true,
          },
          userInfo: null,
        },
        version: 0,
      }),
    );
  });

test('expired session shows the API error, then redirects to login with the same message', async ({
  page,
  context,
}) => {
  await seedSignedInUser(context);
  await context.route('http://localhost:8090/**', (route) =>
    route.fulfill({
      status: 403,
      contentType: 'application/problem+json',
      body: PROBLEM_403,
    }),
  );

  await page.goto('/admin/auctions');

  await expect(page.getByText(/your session has expired/i).first()).toBeVisible({
    timeout: 15_000,
  });

  await page.waitForURL(/\/login/, { timeout: 10_000 });
  await expect(page.getByText(/your session has expired/i).first()).toBeVisible();
  await expect(page.getByText(/access denied/i).first()).toBeVisible();
});

test('sign out calls POST /logout', async ({ page, context }) => {
  await seedSignedInUser(context);

  const logoutCalls: { method: string; status: number }[] = [];
  await context.route('http://localhost:8090/**', async (route) => {
    const request = route.request();
    if (request.url().endsWith('/logout')) {
      logoutCalls.push({ method: request.method(), status: 204 });
      return route.fulfill({ status: 204, body: '' });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ content: [], page: { totalRecords: 0 } }),
    });
  });

  await page.goto('/admin/users');
  await page.getByRole('button', { name: 'Sign out', exact: true }).first().click();

  await expect
    .poll(() => logoutCalls, { timeout: 10_000 })
    .toEqual([{ method: 'POST', status: 204 }]);
  await page.waitForURL(/\/login/, { timeout: 10_000 });
});
