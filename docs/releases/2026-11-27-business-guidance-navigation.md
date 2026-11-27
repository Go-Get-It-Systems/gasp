# Business guidance navigation

## Problem and change

The follow confirmation's Go to Gasps link dispatched Expo Router dismissTo (POP_TO) from Discover. React Navigation's tab router does not handle that stack action, so the tab did not change. The empty-inbox Explore brands link had the same issue.

Tab links now navigate to the destination tab. A follow confirmation inside a Business modal still dismisses the modal before selecting Gasps; the source comes from the actual route segments rather than the button's visual variant.

## Validation

- 16 focused tests passed, covering follow completion, session changes, tab navigation, modal dispatch and private-viewer session isolation.
- TypeScript and targeted ESLint passed.
- Regression exercises the actual React Navigation tab reducer: POP_TO is unhandled, while the destination selected through NAVIGATE changes correctly.
- Native app/device confirmation remains pending. The fix has not been copied into the running development preview while the owner is testing it.
- The two simulators and physical iPhone were confirmed attached to the same development server for the existing beta-content preview. No backend or production deployment was made for this fix.

## Test protocol

Before every coordinated test, verify the app revision/bundle, API environment/backend revision and signed-in account for every participant, as documented in the shared release workflow. Shared Firebase authentication is not evidence of shared API data.
