const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Only watch the specific monorepo folders that mobile actually needs
config.watchFolders = [
  path.resolve(monorepoRoot, 'packages/@cashou/api'),
  path.resolve(monorepoRoot, 'node_modules'),
];

config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer/expo'),
};

config.resolver = {
  ...config.resolver,
  assetExts: config.resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...config.resolver.sourceExts, 'svg'],
  // Let Metro resolve modules from both the mobile app and the monorepo root
  nodeModulesPaths: [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(monorepoRoot, 'node_modules'),
  ],
  blockList: [
    /.*\/packages\/@cashou\/db-app\/.*/,
    /.*\/packages\/@cashou\/db-backoffice\/.*/,
  ],
};

module.exports = withNativeWind(config, { input: './global.css' });
