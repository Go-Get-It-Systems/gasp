# Business live validation — 26 November 2026

Scope: existing Business Studio implementation, production pilot limited to two dedicated test workspaces. No TestFlight build or submission is authorized in this task. No application or backend code changed for this validation.

Actors in the first two rounds: Iaco as workspace owner on the physical iPhone; Bi as follower on iPhone 17 Pro Simulator. Both workspace profiles showed one follower and Bi was already following. Owner UI observations in those rounds were reported by the user; follower UI observations were directly inspected through Simulator. In the additional camera round, Bi used the physical iPhone and Iaco used Simulator.

## Photo campaign: no featuring consent

Workspace: GASP E2E Test Business. Campaign: Test Business Validation.

- User created a draft with a photo of shoes, no overlay, replay off; saved as Draft and published as Live.
- Bi received the campaign under Business campaigns. Photo loaded in the viewer.
- Owner reported Delivered 1, Failed 0, Opened 1, Viewed 0, Reacted 0, Featured 0; delivery/open rates 100%.
- After Finish viewing on Bi, owner refreshed and confirmed Viewed 1.
- Bi selected a synthetic prerecorded nine-second audio test video, kept featuring consent off, and submitted. App displayed Reaction sent.
- Owner refreshed and confirmed Reacted 1, Featured 0.
- Owner opened Watch reaction from Bi and confirmed both the original photo and reaction video with audible sound.
- Feature reaction was disabled; user confirmed Not approved for featuring.

## Video campaign: consent, featuring, withdrawal

Workspace: GASP Push E2E Test. Campaign: Test Business - com consentimento.

- User recorded a short video on the physical iPhone, selected Use Video, saved Draft and published Live.
- Bi opened the new campaign from the business profile. Video image loaded and playback was observed. Sound output for this campaign was not verified; native controls showed muted volume during inspection.
- Bi finished viewing, selected the same synthetic prerecorded reaction video, explicitly changed consent from off to on, and submitted. App displayed Reaction sent.
- Owner confirmed Feature reaction enabled, tapped it, and confirmed Remove featured reaction.
- Bi inspected the business profile and found the reaction in both Featured reactions and Reactions with Featured status.
- Bi opened Profile → My campaign reactions → the new campaign, tapped Withdraw featuring consent, and observed Featuring consent is off.
- Reopened the business profile: both Featured reactions and Reactions showed No reactions yet.
- Owner refreshed the campaign dashboard and confirmed Featured returned to 0 and Feature reaction was disabled.
- Owner then opened Watch reaction from Bi on the physical iPhone and explicitly confirmed that the original campaign video reproduced with his recorded voice and counting audible. Original video audio playback is approved for this owner-viewer path.

## Limits and follow-up

- These checks validate the exercised owner/follower workflow and consent UI. They are not a complete security review.
- The first two reactions used prerecorded synthetic videos. The additional camera round below subsequently exercised physical Business reaction capture and delivery.
- Original audio of the second campaign was confirmed by the user in owner playback on the physical iPhone. Follower-side audible output in Simulator was not independently verified.
- Business uses separate original/reaction media blocks and a separate reaction-recording step. This validation does not establish parity with the personal Gasp fullscreen vertical composite or hold-to-reveal flow.
- After submitting a no-replay reaction, the viewer displayed preview-only text and offered no new reaction action. My campaign reactions allows withdrawal when consent is on but provides no enable-consent action when it is off. A second workspace/campaign was used to test opt-in; no API bypass or data reset was used.
- Gallery withdrawal removes gallery visibility; the product explicitly states it does not invalidate copied public media links or downloaded files.
- All three new campaigns remain Live, including the additional camera campaign below. No campaigns or test reactions were deleted. All three new reactions have featuring consent off at completion.
- The first two campaigns used each workspace's original daily publication allowance. The user subsequently increased that allowance to ten, as documented below.

Result: exercised draft/publication/delivery/view/reaction/owner playback (including original video audio)/consent/feature/withdrawal scenarios passed. Physical Business reaction capture was subsequently validated in the additional round below, with audio verification limits stated explicitly.

## Additional camera round and publication limit

- User explicitly requested keeping the daily limit at ten campaigns per workspace for further testing (not a temporary increase followed by rollback).
- Set `BUSINESS_STUDIO_CAMPAIGNS_PER_DAY=10` on Railway gasp-backend / production. Read back value 10, pilot enabled, and the same two-workspace allowlist; no rollout expansion.
- Deployment `1b9e2304-f7e9-4525-bd4e-7a28b1c11605` reached SUCCESS with the existing main revision `3c6b7b7604d6b93eca14d36ae7b6f2ae6296abed`. Health endpoint returned status ok after deployment.
- Created and published `Teste Business - camera iPhone` in GASP E2E Test Business from Iaco Simulator, using the synthetic purple FOTO E2E image, empty overlay, and replay enabled. Confirmation showed one opt-in follower. UI reached Live, confirming another same-day publication succeeded under the new configuration.
- Follow-up UI issue: the publication confirmation still says One campaign per UTC day; this static copy no longer matches the configured limit. No app copy change was made during the operational configuration update.
- Kept the new campaign unconsumed in Simulator so Bi could complete the physical camera test on the iPhone.

### Physical camera result

- User switched the physical iPhone to Bi, found the new campaign, finished viewing and used Record reaction video.
- User explicitly confirmed both face and own voice in the recorded preview, then submitted with featuring consent off and confirmed Reaction sent.
- Iaco's owner dashboard in Simulator showed Audience snapshot 1, Queued 0, Delivered 1, Failed 0, Opened 1, Viewed 1, Reacted 1, Featured 0. All four rates were 100%.
- Feature reaction was disabled with Not approved for featuring.
- Opened Watch reaction from Bi: the purple original photo loaded, the physical camera recording showed the user's face, and successive frames confirmed playback. Player indicated approximately six seconds of video. Returned to the owner dashboard after inspection.
- Audio was confirmed by the user in the physical recorded preview. Sound output of this specific received recording was not independently verified in Simulator, whose player was muted. Do not describe that as an independent received-audio listening test.
- Physical camera capture, preview and reaction delivery passed within this exercised scope. No TestFlight build or submission occurred.
