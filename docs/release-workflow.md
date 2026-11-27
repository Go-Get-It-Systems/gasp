# GASP development and beta release workflow

Project decision approved on 27 November 2026. This is the shared release policy for developers and coding agents. CLAUDE.md and AGENTS.md reference this document so the policy has one source of truth.

## Source and integration

1. Make changes in a dedicated work branch based on the current main. Preserve unrelated work and existing recovery references.
2. Open a pull request to main. Describe the problem, resulting behavior, relevant validation and remaining limitations.
3. Review the final diff and verify the required checks on the exact current PR commit. Recheck after any new commit. Do not bypass failing checks or merge conflicts.
4. Merge the reviewed, authorized change to main. Preserve recovery branches or tags when requested; do not reorganize or delete branches as an incidental release step.

## Beta compilation

1. A distributable beta MUST be compiled from a commit already integrated into main, after its checks pass. Do not distribute a feature-branch or preparation-branch build as the official beta.
2. Use a clean checkout of that exact main commit. Verify the API destination, build profile, update channel and signing team before compilation; exclude local experiments, temporary files and integration-environment overrides.
3. Record the source commit, app version, build number, profile/channel, compilation result and artifact reference. Reuse suitable existing signing credentials; do not rotate them incidentally.
4. Code added after a build is not present in that binary. Build again from main when approved changes need to be included. Select the recorded artifact explicitly; do not rely on an ambiguous latest build.

## Distribution and deployments

- Merge, compilation, Apple submission, TestFlight assignment and backend deployment are separate actions. State which has actually completed. Respect authorization already given for each action; do not request it again unless scope changes.
- A request to version or compile does not itself authorize invitations, TestFlight distribution or backend deployment.
- Before merging a backend change, inspect its deployment triggers and explain any automatic production effect. Do not assume main is disconnected from deployment.
- Before distributing, confirm the app/API combination, applicable Apple requirements, manual group settings and exactly the authorized testers. Keep visual/device checks visible as pending until performed.
- Preserve the rollback reference for the prior known-good code and record relevant configuration/data changes. A Git rollback alone does not restore migrated data or storage permissions.

## Clear status reporting

Report these states distinctly: implemented locally, committed, pushed, reviewed, merged to main, main checks passed, compiled, submitted, and distributed. “Prepared for beta” must name whether code or an actual installable artifact is ready, and identify any remaining validation.

This document defines the required workflow; it does not claim that every gate is mechanically enforced by CI. Any future automation should implement this same sequence. Project-owner instructions can explicitly change this policy; record the decision here to keep future work aligned.
