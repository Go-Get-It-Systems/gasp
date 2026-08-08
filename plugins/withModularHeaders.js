const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Two-pronged fix for @react-native-firebase v22+ on Expo SDK 54 + RN 0.81 + new arch:
 *
 * 1. `use_modular_headers!` at root level — gives all pods (including React-Core)
 *    automatic module maps, so RCT_EXPORT_MODULE and other macros expand correctly.
 *
 * 2. `$RNFirebaseAsStaticFramework = true` — required when Firebase is linked as a
 *    static framework, so CocoaPods generates the Firebase Swift compatibility header.
 *
 * 3. `CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES` ONLY for RNFB pods —
 *    silences the "non-modular include inside framework module" fatal warning that
 *    fires in RNFB pods regardless of (1), without breaking React-Core's macro expansion
 *    (which would happen if the flag were applied globally).
 */
module.exports = function withModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        'Podfile'
      );

      console.log('[withModularHeaders] Patching Podfile:', podfilePath);

      if (!fs.existsSync(podfilePath)) {
        console.warn('[withModularHeaders] Podfile not found, skipping');
        return config;
      }

      let contents = fs.readFileSync(podfilePath, 'utf-8');

      contents = contents.replace(/^\s*use_modular_headers!\s*$/gm, '');

      const platformRegex = /(platform :ios.*?\n)/;
      if (platformRegex.test(contents)) {
        contents = contents.replace(
          platformRegex,
          '$1use_modular_headers!\n'
        );
        console.log('[withModularHeaders] ✓ inserted use_modular_headers! at root level');
      } else {
        console.warn('[withModularHeaders] ✗ platform directive not found');
      }

      const staticFrameworkFlag = '$RNFirebaseAsStaticFramework = true';
      if (!contents.includes(staticFrameworkFlag)) {
        const frameworkConfigRegex = /(\s*use_frameworks! :linkage => ENV\['USE_FRAMEWORKS'\]\.to_sym if ENV\['USE_FRAMEWORKS'\]\n)/;

        if (frameworkConfigRegex.test(contents)) {
          contents = contents.replace(
            frameworkConfigRegex,
            `$1  ${staticFrameworkFlag}\n`
          );
          console.log('[withModularHeaders] ✓ enabled RN Firebase static framework support');
        } else {
          console.warn('[withModularHeaders] ✗ use_frameworks directive not found');
        }
      } else {
        console.log('[withModularHeaders] RN Firebase static framework support already enabled');
      }

      const flagName = 'CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES';
      if (!contents.includes(flagName)) {
        const postInstallRegex =
          /(post_install do \|installer\|\s*\n)([\s\S]*?)(\n(\s*)end\s*\n\s*end\s*$)/m;
        const injectedBlock = `
    installer.pods_project.targets.each do |target|
      if target.name.start_with?('RNFB')
        target.build_configurations.each do |config|
          config.build_settings['${flagName}'] = 'YES'
        end
      end
    end`;

        if (postInstallRegex.test(contents)) {
          contents = contents.replace(postInstallRegex, (m, header, body, tail) => {
            return `${header}${body}${injectedBlock}${tail}`;
          });
          console.log('[withModularHeaders] ✓ inserted CLANG_ALLOW for RNFB-only pods');
        } else {
          console.warn('[withModularHeaders] ✗ post_install block not found');
        }
      } else {
        console.log('[withModularHeaders] CLANG_ALLOW flag already present');
      }

      fs.writeFileSync(podfilePath, contents);
      console.log('[withModularHeaders] Podfile patched successfully');
      return config;
    },
  ]);
};
