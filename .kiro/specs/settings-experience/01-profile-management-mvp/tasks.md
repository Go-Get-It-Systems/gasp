# Tasks — Profile Management MVP

- [ ] 1. Align the user contract
  - [ ] Add `bio` to the frontend user schema/type and fixtures.
  - [ ] Add focused API/schema tests for the accepted profile payload.

- [ ] 2. Build the edit-profile form
  - [ ] Replace the placeholder modal with prefilled fields and validation.
  - [ ] Add accessible Save, Cancel, Change photo, and Remove photo controls.
  - [ ] Add loading, conflict, and retry states.

- [ ] 3. Implement avatar selection and upload
  - [ ] Reuse permission, compression, and approved avatar upload paths.
  - [ ] Keep local preview separate from saved `avatarUrl` until the profile PATCH succeeds.
  - [ ] Support remove avatar with confirmation if a photo is already set.

- [ ] 4. Synchronize identity
  - [ ] Update auth state and relevant React Query caches after a successful save.
  - [ ] Verify current-user identity rerenders in Profile, Settings, Chat, and Inbox.

- [ ] 5. Test
  - [ ] Unit-test validation and success/error transitions.
  - [ ] Add integration tests for photo replace/remove and username conflict.
  - [ ] Execute `verification.md` on iOS and Android where available.
