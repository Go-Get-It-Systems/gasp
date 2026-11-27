# Business guidance navigation

## Problem and change

The follow confirmation's Go to Gasps link dispatched Expo Router dismissTo (POP_TO) from Discover. React Navigation's tab router does not handle that stack action, so the tab did not change. The empty-inbox Explore brands link had the same issue.

Tab links now navigate to the destination tab. A follow confirmation inside a Business modal still dismisses the modal before selecting Gasps; the source comes from the actual route segments rather than the button's visual variant.

## Validation

- 16 focused tests passed, covering follow completion, session changes, tab navigation, modal dispatch and private-viewer session isolation.
- TypeScript and targeted ESLint passed.
- Regression exercises the actual React Navigation tab reducer: POP_TO is unhandled, while the destination selected through NAVIGATE changes correctly.
- Native simulator validation passed on iPhone 17 Pro using Bi: follow Adidas, open Go to Gasps from the Business profile, and repeat from the Discover card. Both select the Gasps tab; the profile modal is dismissed. Adidas was restored to its original followed state.
- The two changed source files were copied to the shared development preview after the owner authorized continuing. Both simulators and the physical iPhone remain attached to that development server against the beta-content API. The owner then confirmed on the physical iPhone that Go to Gasps opens correctly. This closes physical validation of the reported button issue.
- Explore brands is covered by the automated tab-navigation and empty-inbox tests; its native empty state was not exercised because the test account follows brands.
- The two simulators and physical iPhone were confirmed attached to the same development server for the existing beta-content preview. No backend or production deployment was made for this fix.

## Test protocol

Before every coordinated test, verify the app revision/bundle, API environment/backend revision and signed-in account for every participant, as documented in the shared release workflow. Shared Firebase authentication is not evidence of shared API data.
