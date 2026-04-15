/**
 * Expo config plugin: Disable Dead Code Stripping in the Xcode project.
 *
 * When building React Native from source (RCT_USE_PREBUILT_RNCORE=0),
 * the linker's Dead Code Stripping can remove TurboModule registrations,
 * causing crashes on iOS 26. This plugin disables that optimization.
 *
 * Related issues:
 * - https://github.com/facebook/react-native/issues/54859
 * - https://github.com/expo/expo/issues/44356
 * - https://github.com/facebook/react-native/pull/55390
 */
const { withXcodeProject } = require('@expo/config-plugins');

function withTurboModuleCrashFix(config) {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const configurations = project.pbxXCBuildConfigurationSection();

    for (const key in configurations) {
      const buildSettings = configurations[key].buildSettings;
      if (buildSettings) {
        // Disable Dead Code Stripping to prevent TurboModule registrations
        // from being stripped when building React Native from source
        buildSettings.DEAD_CODE_STRIPPING = 'NO';
      }
    }

    return config;
  });
}

module.exports = withTurboModuleCrashFix;
