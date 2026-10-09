# Continuous integration

Use a short-lived feature/fix branch and open a pull request into `main`. The
`CI` check runs locked dependency installation, lint, TypeScript, the complete
Jest suite, icon validation, and JavaScript/Hermes exports for iOS and Android.
The same workflow runs after a merge to `main`.

For the current solo workflow, `main` requires a PR, an up-to-date branch,
successful GitHub Actions `CI`, and resolved conversations, but no approval
from another account. Administrators must also follow these rules.

Run locally with Node 22:

```sh
npm ci --legacy-peer-deps --no-audit --no-fund
npm run lint
npm run typecheck
npm run test:ci
npm run validate:icons
npm run build:ci
```

Lint warnings remain visible; errors block CI. No tests are skipped for CI.
The export step does not require Firebase service files or contact the backend.
It is not a native binary build: signing, native Firebase configuration, camera,
push notifications, and device behavior still require the existing native
build workflow and simulator/device QA before a mobile release.

This change creates no new environment, changes no runtime endpoint, and does
not automatically publish a mobile binary or an Expo update. Backend deployment
continues through the existing Railway service and is handled in its repository.
