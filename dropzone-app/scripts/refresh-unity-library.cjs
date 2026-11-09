// Export and compile a Unity Android library. Deliberately never packages an APK.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const app = path.resolve(__dirname, '..');
const project = path.resolve(app, '../dropzone-unity');
const editor = process.env.DROPZONE_UNITY_EDITOR || '/Applications/Unity/Hub/Editor/6000.5.6f1';
const android = path.join(editor, 'PlaybackEngines/AndroidPlayer');
const log = path.join(os.tmpdir(), 'dropzone-library-refresh.log');
const fd = fs.openSync(log, 'w');
function run(command, args, cwd, env = process.env) {
  const result = spawnSync(command, args, { cwd, env, stdio: ['ignore', fd, fd] });
  if (result.error || result.status !== 0) throw new Error(`${path.basename(command)} failed; inspect ${log}. ${result.error?.message || ''}`);
}
try {
  const disk = fs.statfsSync(app);
  if (disk.bavail * disk.bsize < 1.5 * 1024 ** 3) throw new Error('At least 1.5 GB free disk space is required before refreshing the Unity library.');
  console.log('Exporting Unity Android library; no APK will be generated.');
  const review = process.argv.includes('--review-poses');
  run(path.join(editor, 'Unity.app/Contents/MacOS/Unity'), ['-batchmode', ...(review ? [] : ['-nographics']), '-quit', '-projectPath', project, '-executeMethod', review ? 'DropZoneSetup.FinalizeMotionPolish' : 'DropZoneSetup.ExportAndroid', '-logFile', log + '.unity'], project);
  const library = path.join(app, 'unity-export/unityLibrary');
  const generated = 'src/main/Il2CppOutputProject';
  console.log('Compiling ARM64 shared library using the installed Unity NDK.');
  run(path.join(library, generated, 'IL2CPP/build/deploy/il2cpp'), [
    '--compile-cpp', '--platform=Android', '--architecture=arm64',
    '--outputpath=src/main/jniLibs/arm64-v8a/libil2cpp.so', '--baselib-directory=src/main/jniStaticLibs/arm64-v8a',
    '--incremental-g-c-time-slice=3', '--configuration=Release', '--dotnetprofile=unityaot-linux',
    `--usymtool-path=${generated}/usymtool`, '--static-lib-il2-cpp',
    `--data-folder=${generated}/Source/il2cppOutput/data`, `--generatedcppdir=${generated}/Source/il2cppOutput`,
    '--cachedirectory=build/dropzone-arm64', `--tool-chain-path=${path.join(android, 'NDK')}`,
  ], library, { ...process.env, ANDROID_SDK_ROOT: path.join(android, 'SDK'), ANDROID_NDK_ROOT: path.join(android, 'NDK') });
  run(process.execPath, [path.join(__dirname, 'finalize-unity-library.cjs')], app);
  console.log(`Unity library refreshed and fingerprinted. Build log: ${log}. No APK created.`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { fs.closeSync(fd); }
