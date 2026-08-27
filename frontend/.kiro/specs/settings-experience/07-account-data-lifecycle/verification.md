# Verification — Account Data Lifecycle

1. Request an export, complete re-verification, download it in the correct account, and verify expiry prevents a later download.
2. Try export status/download from another account and confirm denial.
3. Deactivate A; verify A disappears from search/recommendations/presence and cannot send or receive interactions.
4. Reactivate within the window; verify permitted identity/data restoration.
5. Request deletion, confirm immediate logout/session revocation, cancel inside the grace period, then repeat through final execution in a non-production test environment.
6. Verify background jobs leave no accessible media or device tokens contrary to the approved retention matrix.
