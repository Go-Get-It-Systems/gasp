# Business follow guidance

Approved scope: explain future campaign delivery after following, clarify that public posts are previews, and guide customers from an empty campaign inbox. Delivery and reaction eligibility are unchanged.

## Changes

- Portuguese and English copy approved in the conversation.
- Inline confirmation after a successful follow, with a Go to Gasps action. Failed follows and unfollows do not show the success message. Session generation and account identity prevent stale confirmations after account changes.
- Empty campaign inbox distinguishes customers already following a brand from customers who can explore brands. Unknown directory state and an empty pilot directory do not claim the customer follows no brands. Inbox errors retain the existing error state.
- Navigation leaves Business modal routes before selecting Gasps or Discover.

## Validation

- 618 tests passed across 97 suites, including ten new guidance scenarios and existing campaign eligibility tests.
- TypeScript and targeted ESLint passed.
- Physical-device visual validation of this guidance remains pending; no follow or campaign data was changed for the automated tests.

## Distribution

This change is prepared separately from main. The completed iOS 1.1.0 build 7 predates this change and does not contain the new guidance. No new binary, Apple submission, TestFlight assignment, invitation, backend change, or production deployment is part of this update.
