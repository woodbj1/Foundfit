const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// Ensure this project's node_modules is checked first, preventing the root
// workspace's node_modules (which has a different React version) from
// being accidentally resolved by Metro.
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  // Allow fallback resolution for nested dependencies within packages
  ...config.resolver.nodeModulesPaths || [],
]
// Remove any root-level node_modules from the resolution paths
config.resolver.nodeModulesPaths = config.resolver.nodeModulesPaths.filter(
  (p) => !p.endsWith('foundfit\\node_modules') && !p.endsWith('foundfit/node_modules')
)

module.exports = config
