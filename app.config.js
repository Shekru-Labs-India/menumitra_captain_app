// Import not supported in app.config.js, use inline value for now
const APP_ENV = process.env.APP_ENV || 'dev';

module.exports = ({ config }) => {
  const buildType = process.env.EAS_BUILD_PROFILE || 'development';
  
  // Base package name
  const basePackageName = 'com.menumitra.captainapp';
  
  // Determine package name based on build profile and APP_ENV
  const packageName = buildType === 'production' && APP_ENV === 'prod'
    ? basePackageName 
    : `${basePackageName}.preview`;

  // Determine app name suffix based on environment
  const appNameSuffix = APP_ENV === 'prod' ? '' : ' (Preview)';

  return {
    ...config,
    name: `${config.name}${appNameSuffix}`,
    android: {
      ...config.android,
      package: packageName,
    },
    extra: {
      ...config.extra,
      buildType,
      environment: APP_ENV,
    },
    updates: {
      ...config.updates,
      // Use different update channels based on APP_ENV
      channel: APP_ENV === 'prod' ? 'production' : 'preview'
    }
  };
}; 