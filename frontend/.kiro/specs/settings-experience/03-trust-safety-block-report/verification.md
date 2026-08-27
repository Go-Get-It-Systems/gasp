# Verification — Trust, Safety, Block & Report

Use two real test accounts:

Automated coverage completed locally: backend safety routes and chat enforcement
delegation; app report validation and chat participant navigation. Full suites:
`111` backend tests and `333` app tests passing. The following device/API checks
remain required before release.

1. Block B from A’s profile; confirm B cannot send A a friend request, message, or gasp.
2. Confirm B is hidden from A’s search, recommendations, and normal conversation list.
3. Confirm A can find B in Blocked Users and unblock them.
4. Confirm unblocking does not silently recreate friendship or restore hidden history unexpectedly.
5. Submit a profile and content report; confirm success feedback and no visible disclosure to B.
6. Confirm direct API calls bypassing the app still receive forbidden/filtered behavior.
