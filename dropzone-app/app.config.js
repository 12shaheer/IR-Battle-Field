const fs = require('fs');
const path = require('path');

module.exports = ({ config }) => {
  const unityReady = fs.existsSync(path.join(__dirname, 'unity-export/dropzone-export.json')) && fs.existsSync(path.join(__dirname, 'unity-export/unityLibrary/build.gradle'));
  if (process.env.DROPZONE_REQUIRE_UNITY === '1' && !unityReady) {
    throw new Error('Unity export is missing. Export the Android library from dropzone-unity before preparing the native app.');
  }
  return {
    ...config,
    plugins: [...(config.plugins || []), ...(unityReady ? ['./plugins/withDropZoneUnity'] : [])],
    extra: { ...config.extra, unityLibraryIncluded: unityReady },
  };
};
