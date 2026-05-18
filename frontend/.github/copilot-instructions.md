<!-- .github/copilot-instructions.md: Guidance for AI coding agents working on this Ionic + Angular (standalone) project -->

This repository is an Ionic + Angular (v20) frontend using Angular's standalone components pattern. Keep instructions concise and actionable and reference the concrete files below when making changes.

Key facts
- Project type: Ionic (angular-standalone). See `ionic.config.json`.
- Angular bootstrap: `src/main.ts` uses `bootstrapApplication(...)` with `provideRouter(...)` and `provideIonicAngular()`.
- Routing: top-level routes in `src/app/app.routes.ts` delegate to `src/app/tabs/tabs.routes.ts`.
- Pages are lazy-loaded with `loadComponent()` (see `tabs.routes.ts`).
- Components use the standalone `imports: [...]` array in their `@Component` decorators (see `tabs.page.ts` and `app.component.ts`).

Build / test / dev commands (explicit)
- Start dev server (uses Angular CLI): `npm run start` (runs `ng serve`, default configuration `development`).
- Build production: `npm run build` or `ng build --configuration production`.
- Continuous watch build: `npm run watch` runs `ng build --watch --configuration development`.
- Tests: `npm run test` (Karma + Jasmine). For CI use `ng test --watch=false --progress=false` or rely on `angular.json` "ci" test configuration.
- Linting: `npm run lint` (angular-eslint configured; see `angular.json` and devDependencies).

Important repository patterns (do not change without reason)
- Standalone components: components and pages import required Angular/Ionic symbols in the `imports` array rather than relying on NgModules. Example: `src/app/tabs/tabs.page.ts` uses `imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel]` and `addIcons(...)` for icon registration.
- Lazy-loading: routes use `loadComponent: () => import('../tab1/tab1.page').then(m => m.Tab1Page)`. Preserve this pattern for page-level routes to keep bundle sizes small.
- Router setup: `src/main.ts` calls `provideRouter(routes, withPreloading(PreloadAllModules))`. New routes should be added to `src/app/app.routes.ts` (or nested `tabs.routes.ts`) and follow the existing loadComponent style.
- Environment switching: production build replaces `src/environments/environment.ts` with `src/environments/environment.prod.ts` (see `angular.json` file replacements).
- Output path: the build `outputPath` is configured to use `www` (see `angular.json`). CI or deployment workflows should pick files from `www`.

Files to inspect when implementing changes
- Routing and bootstrapping: `src/main.ts`, `src/app/app.routes.ts`, `src/app/tabs/tabs.routes.ts`.
- Component examples: `src/app/app.component.ts`, `src/app/tabs/tabs.page.ts`, `src/app/tab1/tab1.page.ts` (and other `tabX` pages).
- Global styles & theme: `src/global.scss`, `src/theme/variables.scss`.
- Build/test config: `package.json`, `angular.json`, `karma.conf.js`, `tsconfig.*.json`.

Quick examples for common edits
- Add a new standalone page and route:
  1) Create `src/app/my-page/my-page.page.ts` exporting `MyPage` as a standalone component with `imports` array.
  2) Add route in `src/app/tabs/tabs.routes.ts` or `app.routes.ts` using `loadComponent: () => import('./my-page/my-page.page').then(m => m.MyPage)`.

- Register new Ionicons only where needed (avoid global side effects): use `import { addIcons } from 'ionicons'` inside the page or top-level component as in `tabs.page.ts`.

What to avoid / watch for
- Do not convert lazy-loaded `loadComponent` routes into eager imports; this increases bundle size.
- Don't assume NgModule-based patterns — this repo uses standalone components throughout.
- When changing build outputs or `angular.json`, update any deployment/CI scripts that expect `www`.

If you are unsure about runtime behavior, run these locally:
```
npm install
npm run start
```

Preferred model and how to request it
- Preferred assistant model: `GPT-5 mini`. NOTE: this repository cannot force a particular model on every client; instead, request `GPT-5 mini` in the system/prompt header when starting a coding session or in Copilot Labs/CLI settings if available.
- Suggested starter prompt (place in the system role or at the top of your session):
  > System: Prefer the `GPT-5 mini` model for responses. When generating code, follow the project's standalone-component and lazy-loading patterns; keep edits minimal and reference `src/main.ts`, `src/app/*`, and `angular.json`.
- If a client allows model selection (Copilot Labs, local assistant, or API key-backed tool), configure that client to prefer `gpt-5-mini` or choose the closest available high-capability small/fast model.

If content here should be updated or expanded, leave a short comment in the PR describing the missing knowledge you needed.

-- End of guidance --
