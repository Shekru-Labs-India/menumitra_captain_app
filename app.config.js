module.exports = ({ config }) => {
  const buildType = process.env.EAS_BUILD_PROFILE || 'development';
  
  // Base package name
  const basePackageName = 'com.menumitra.captainapp';
  
  // Determine package name based on build profile
  const packageName = buildType === 'production' 
    ? basePackageName 
    : `${basePackageName}.preview`;

  return {
    ...config,
    android: {
      ...config.android,
      package: packageName,
    },
    extra: {
      ...config.extra,
      buildType,
    },
  };
}; 