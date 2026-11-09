const { withSettingsGradle, withProjectBuildGradle, withAppBuildGradle, withGradleProperties, withMainApplication, withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { fingerprint: runtimeFingerprint } = require('../scripts/unity-source-fingerprint.cjs');

module.exports = function withDropZoneUnity(config) {
  config = withProjectBuildGradle(config, config => {
    const unityNdk = '/Applications/Unity/Hub/Editor/6000.5.6f1/PlaybackEngines/AndroidPlayer/NDK';
    if (!config.modResults.contents.includes('// DropZone shared NDK')) {
      const marker = 'apply plugin: "expo-root-project"';
      if (!config.modResults.contents.includes(marker)) throw new Error('Cannot locate Expo root Gradle configuration');
      const localNdk = fs.existsSync(path.join(unityNdk, 'source.properties')) ? `\nsubprojects { p ->\n ['com.android.application', 'com.android.library'].each { id ->\n  p.plugins.withId(id) { p.android.ndkPath = '${unityNdk}' }\n }\n}\n` : '';
      config.modResults.contents = config.modResults.contents.replace(marker, `// DropZone shared NDK\next.ndkVersion = '27.2.12479018'\n${localNdk}\n${marker}`);
    }
    if (!config.modResults.contents.includes('// DropZone shared Build Tools')) {
      const block = `// DropZone shared Build Tools\nsubprojects { p ->\n ['com.android.application', 'com.android.library'].each { id ->\n  p.plugins.withId(id) {\n   p.extensions.getByName('androidComponents').finalizeDsl { dsl -> dsl.buildToolsVersion = '36.0.0' }\n  }\n }\n}\n\n`;
      config.modResults.contents = config.modResults.contents.replace('apply plugin: "expo-root-project"', block + 'apply plugin: "expo-root-project"');
    }
    return config;
  });
  config = withGradleProperties(config, config => {
    for (const [key, value] of Object.entries({ unityStreamingAssets: '', 'unity.installInBuildFolder': 'false', 'android.minSdkVersion': '26', reactNativeArchitectures: 'arm64-v8a' })) {
      config.modResults = config.modResults.filter(p => p.key !== key);
      config.modResults.push({ type: 'property', key, value });
    }
    return config;
  });
  config = withSettingsGradle(config, config => {
    if (!config.modResults.contents.includes('// DropZone Unity')) {
      config.modResults.contents += `\n// DropZone Unity\ninclude ':unityLibrary'\nproject(':unityLibrary').projectDir = new File(rootDir, '../unity-export/unityLibrary')\n`;
    }
    return config;
  });
  config = withAppBuildGradle(config, config => {
    if (!config.modResults.contents.includes('// DropZone Unity')) {
      config.modResults.contents += `\n// DropZone Unity\ndependencies {\n implementation project(':unityLibrary')\n implementation 'com.google.mlkit:barcode-scanning:17.3.0'\n}\nandroid { packaging { jniLibs { useLegacyPackaging true; pickFirsts += ['**/libc++_shared.so'] } } }\n`;
    }
    if (!config.modResults.contents.includes("pickFirsts += ['**/libc++_shared.so']")) config.modResults.contents += "\nandroid { packaging { jniLibs { useLegacyPackaging true; pickFirsts += ['**/libc++_shared.so'] } } }\n";
    return config;
  });
  config = withMainApplication(config, config => {
    if (!config.modResults.contents.includes('new com.dropzone.unity.DropZonePackage()') && !config.modResults.contents.includes('add(com.dropzone.unity.DropZonePackage())')) {
      if (config.modResults.language === 'kt') {
        const marker = 'PackageList(this).packages.apply {';
        if (!config.modResults.contents.includes(marker)) throw new Error('Cannot locate React Native package registration');
        config.modResults.contents = config.modResults.contents.replace(marker, marker + '\n              add(com.dropzone.unity.DropZonePackage())');
      } else throw new Error('DropZone Unity currently requires the Expo Kotlin MainApplication template');
    }
    return config;
  });
  config = withAndroidManifest(config, config => {
    const app = config.modResults.manifest.application[0];
    app.$['tools:replace'] = [...new Set([...(app.$['tools:replace'] || '').split(',').filter(Boolean), 'android:enableOnBackInvokedCallback'])].join(',');
    app.activity = app.activity || [];
    if (!app.activity.some(a => a.$['android:name'] === 'com.dropzone.unity.DropZoneActivity')) app.activity.push({ $: {
      'android:name': 'com.dropzone.unity.DropZoneActivity', 'android:exported': 'false',
      'android:screenOrientation': 'sensorLandscape', 'android:hardwareAccelerated': 'true',
      'android:configChanges': 'orientation|screenSize|keyboardHidden|keyboard|navigation|uiMode|screenLayout|smallestScreenSize|density|fontScale',
      'android:theme': '@style/UnityThemeSelector'
    }, 'meta-data': [{ $: { 'android:name': 'unityplayer.UnityActivity', 'android:value': 'true' } }] });
    config.modResults.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    if (!app.activity.some(a => a.$['android:name'] === 'com.unity3d.player.UnityPlayerActivity')) app.activity.push({ $: { 'android:name': 'com.unity3d.player.UnityPlayerActivity', 'tools:node': 'remove' } });
    return config;
  });
  return withDangerousMod(config, ['android', async config => {
    const root = config.modRequest.projectRoot;
    if (!fs.existsSync(path.join(root, 'unity-export/unityLibrary/build.gradle'))) {
      throw new Error('Unity library is missing. Run DropZoneSetup.ExportAndroid in Unity first. No APK is needed.');
    }
    const source = path.join(root, 'native-unity');
    // Remove export-machine paths so the selected Android SDK/NDK owns compilation.
    const libraryGradle = path.join(root, 'unity-export/unityLibrary/build.gradle');
    let gradle = fs.readFileSync(libraryGradle, 'utf8')
      .replace("implementation fileTree(dir: 'libs', include: ['*.jar'])", "api fileTree(dir: 'libs', include: ['*.jar'])")
      .replace(/^\s*ndkPath .*$/m, '')
      .replaceAll('getProperty("unity.androidNdkPath")', 'android.ndkDirectory.absolutePath')
      .replaceAll('getProperty("unity.androidSdkPath")', 'android.sdkDirectory.absolutePath');
    const prebuiltPath = path.join(root, 'unity-export/dropzone-prebuilt.json');
    if (fs.existsSync(prebuiltPath)) {
      const fingerprint = JSON.parse(fs.readFileSync(prebuiltPath, 'utf8'));
      const runtimeSource = runtimeFingerprint(path.resolve(root,'../dropzone-unity'));
      if (!fingerprint.runtimeSource || fingerprint.runtimeSource !== runtimeSource) throw new Error('Unity gameplay/HUD source is newer than its Android library. Run node scripts/refresh-unity-library.cjs before preparing this app.');
      const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
      const sourceHash = hash(path.join(root, 'unity-export/unityLibrary/src/main/Il2CppOutputProject/Source/il2cppOutput/Assembly-CSharp.cpp'));
      const binaryHash = hash(path.join(root, 'unity-export/unityLibrary/src/main/jniLibs/arm64-v8a/libil2cpp.so'));
      if (fingerprint.source !== sourceHash || fingerprint.binary !== binaryHash) throw new Error('Unity source or binary changed; compile and finalize the Unity library again.');
      if (!gradle.includes('// DropZone verified prebuilt')) gradle += "\n// DropZone verified prebuilt\ntasks.named('buildIl2Cpp') { enabled = false }\nandroid { packaging { jniLibs { excludes += ['**/*.sym.so', '**/*.dbg.so'] } } }\n";
    } else if (process.platform !== 'darwin') {
      throw new Error('This Unity export contains Mac compiler tools. Compile and finalize its Android ELF library before using a Linux build worker.');
    }
    fs.writeFileSync(libraryGradle, gradle);
    const target = path.join(config.modRequest.platformProjectRoot, 'app/src/main/java/com/dropzone/unity');
    fs.mkdirSync(target, { recursive: true });
    for (const file of fs.readdirSync(source).filter(f => f.endsWith('.java'))) fs.copyFileSync(path.join(source, file), path.join(target, file));
    const rules = path.join(config.modRequest.platformProjectRoot, 'app/proguard-rules.pro');
    const keep = '\n# Unity JNI calls these classes by name\n-keep class com.dropzone.unity.** { *; }\n';
    const previous = fs.existsSync(rules) ? fs.readFileSync(rules, 'utf8') : '';
    if (!previous.includes('-keep class com.dropzone.unity.**')) fs.writeFileSync(rules, previous + keep);
    return config;
  }]);
};
