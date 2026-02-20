const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer/expo'),
};

config.resolver = {
  ...config.resolver,
  assetExts: config.resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...config.resolver.sourceExts, 'svg'],
  blockList: [
    /.*\/packages\/@cashou\/db-app\/node_modules\/prisma\/.*/,
    /.*\/packages\/@cashou\/db-app\/node_modules\/@prisma\/.*/,
    /.*\/packages\/@cashou\/db-backoffice\/node_modules\/prisma\/.*/,
    /.*\/packages\/@cashou\/db-backoffice\/node_modules\/@prisma\/.*/,
  ],
};

module.exports = withNativeWind(config, { input: './global.css' });
