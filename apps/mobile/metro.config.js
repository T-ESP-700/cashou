const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configure SVG transformer
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer/expo'),
};

config.resolver = {
  ...config.resolver,
  assetExts: config.resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...config.resolver.sourceExts, 'svg'],
  // Exclude Prisma node_modules from packages to prevent Metro file map conflicts
  blockList: [
    /.*\/packages\/@cashou\/db-app\/node_modules\/prisma\/.*/,
    /.*\/packages\/@cashou\/db-app\/node_modules\/@prisma\/.*/,
    /.*\/packages\/@cashou\/db-backoffice\/node_modules\/prisma\/.*/,
    /.*\/packages\/@cashou\/db-backoffice\/node_modules\/@prisma\/.*/,
  ],
};

module.exports = config;
