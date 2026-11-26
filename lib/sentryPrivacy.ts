/** Error screenshots can contain ephemeral media; never attach them. */
export function getSentryPrivacyOptions(isDevelopment: boolean) {
  return {
    enabled: !isDevelopment,
    attachScreenshot: false,
  } as const;
}
