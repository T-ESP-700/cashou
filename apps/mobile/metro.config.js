const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the monorepo root so Metro can follow Bun workspace symlinks
config.watchFolders = [monorepoRoot];

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
    // Other workspace apps (backend, backoffice)
    /.*\/apps\/backend\/.*/,
    /.*\/apps\/backoffice\/.*/,
    // Prisma packages
    /.*\/packages\/@cashou\/db-app\/.*/,
    /.*\/packages\/@cashou\/db-backoffice\/.*/,
    // Native build artifacts
    /.*\/apps\/mobile\/android\/.*/,
    /.*\/apps\/mobile\/ios\/.*/,
  ],
};

module.exports = withNativeWind(config, { input: './global.css' });
