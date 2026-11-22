---
name: run-web
description: Use when starting, opening, driving or screenshotting the Oxneer web app, including admin pages that need a signed-in user, or when confirming a UI change in a real browser at desktop or mobile width, in dark or light theme.
---

# Running and viewing the Oxneer web app

## 1. Start it

Check `http://localhost:3000` first and reuse a running server. If it's down, run `npm run dev` from the repo root in the background. The API is `http://localhost:8090` (override: `NEXT_PUBLIC_API_URL`).

## 2. Get past the login

Admin and profile routes need a signed-in user. Pick by what the check needs:

| Need                           | Do this                                                                           |
| ------------------------------ | --------------------------------------------------------------------------------- |
| Real data                      | Open `/login` with the Playwright MCP and ask the user to sign in in that window. |
| Layout, empty and error states | Seed a user and mock the API (below). No credentials or backend needed.           |

Never ask for a password in chat. The Playwright MCP keeps its browser profile, so a real sign-in survives between sessions.

Mock with `mcp__playwright__browser_run_code_unsafe`, then navigate:

```js
async (page) => {
  await page.context().addInitScript(() => {
    localStorage.setItem(
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
  await page.context().route('http://localhost:8090/**', (route) => {
    const isArray = /\/api\/v1\/(roles|permissions)(\?|$)/.test(route.request().url());
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(isArray ? [] : { content: [], page: { totalRecords: 0 } }),
    });
  });
};
```

Change the `body` to show rows, or the `status` to show the error state. If a page crashes with `x is not iterable`, that endpoint returns a plain array, so add it to the `isArray` pattern. If you land on `/login`, the browser restarted, so run the whole snippet again.

When you finish, remove the seeded user with `localStorage.removeItem('auth-store')`, because the browser profile persists.

## 3. Look at it

- Sizes: `browser_resize` to 1440×900 (desktop) and 390×844 (mobile).
- Theme: set it with `localStorage.setItem('theme', 'light')` via `browser_evaluate`, then reload. Dark is the default.
- Prefer `browser_snapshot` for structure and text. Use `browser_take_screenshot` for visual checks.
- Read `browser_console_messages` after each page load. A hydration or React error there is a bug, even if the page looks right.
