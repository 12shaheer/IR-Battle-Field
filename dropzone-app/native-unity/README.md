# Unity Android integration

Gameplay now opens Unity automatically with the shared cyan HUD; the previous React camera gameplay renderers have been removed. Native startup waits for the first HUD render and displays failures/timeouts. The Activity forwards foreground/pause lifecycle to React so its server and BLE timers remain active during gameplay. Unsupported builds show a setup explanation.

The lifecycle bridge retains the original React Activity as React/Expo's host.
Passing UnityPlayerActivity into ReactHost.onHostResume is invalid: Expo's
AppContext requires AppCompatActivity and throws on the Unity Activity. The Java
regression test runs the real bridge against that host-type contract for both
React architectures. Preview and production EAS profiles require a Unity export;
APK size alone does not establish whether Unity is included. Native compilation
and contract tests do not replace inspecting the installed phone's crash log.

The connected SM-G955U1 on Android 9 confirmed this exact exception in the
installed app's crash buffer. The corrected native bridge compiles and all 18
tests pass. The installed app still contains the old bridge; checking the fix
on-device requires a later native build/install, not a JavaScript-only update.

For a cached local preview of the actual Unity WebGL player, run `npm run preview:unity` from `dropzone-app` and open http://localhost:4173. Use `npm run preview:unity -- --rebuild` after Unity source changes. This checks visuals and motion without APK packaging; it does not validate Android camera/BLE behavior. Current bridge/connection/source-fingerprint tests: 14 passing.

This source integrates the separate Unity project as a full-screen Android Activity. React Native retains backend and BLE ownership. The Unity camera is scanned using bundled ML Kit QR decoding; Expo Camera is released before the Activity starts. This integration requires native library export and native compilation; JavaScript hot reload cannot install it into an old APK.

`app.config.js` includes the config plugin when a successful export marker and `unity-export/unityLibrary/build.gradle` exist. Set `DROPZONE_REQUIRE_UNITY=1` in CI to reject missing exports instead of preparing a build without Unity. Do not remove the export from EAS upload inputs when enabling it.

Native events carry fire/reload requests and battle tag QR strings back to React Native. The existing server API remains authoritative for ammunition and damage. Unity receives state snapshots and presentation commands. Hardware-trigger shots use the existing BLE handler and forward only their presentation, preventing duplicate combat requests.

Validation still required on an Android device: permission denial/retry, camera handoff, QR scan orientation, BLE notifications while the Unity Activity has focus, server latency, unload/re-entry, scene transitions, audio overlap, thermals and memory. This is integration source, not a production certification. iOS Unity embedding is not implemented.

The integration targets ARM64 Android 8.0+ and shares NDK 27.2.12479018 between Unity and React Native. On this Mac the config plugin reuses Unity's installed NDK. On other machines install that NDK in the Android SDK. No SDK license is accepted automatically.

The exported Android `libil2cpp.so` is compiled separately from an APK. `node scripts/finalize-unity-library.cjs` verifies the ARM64 ELF header and records source/binary hashes. On subsequent prebuilds the plugin validates those hashes and disables the Mac-specific IL2CPP task. Refreshing Unity scripts requires exporting, recompiling that library, and finalizing again. Linux/EAS release builds still need validation; the presence of a precompiled library is not proof that the whole app compiles.

## Verified locally

Unity Android export, ARM64 IL2CPP native compilation, Expo prebuild, and the application's `:app:compileDebugJavaWithJavac` task succeed. The bridge classes, Unity Activity and ML Kit scanner compile together. All 13 connection/bridge tests pass. This is a compile check, not an APK packaging or device test.

## Samsung test baseline

Galaxy A32 and Galaxy S8 are the intended first physical test devices. The Unity profile uses OpenGL ES 3, a 30 FPS target, disabled real-time shadows/MSAA, limited pixel lights and pooled weapon effects. Controls respect the display safe area. QR scans select the nearest battle tag within the central aiming area; the player's own battle tag and hardware status are forwarded into Unity. These settings do not constitute measured FPS, battery or thermal results. An S8 running its original Android 7 software must be updated to Android 8 or newer for this integration.

The current hand-motion pass includes articulated finger joints, independent support-hand/magazine motion, staged extraction/insertion/charging, spring recoil and cancellation recovery. Offline render review and multi-frame-rate editor checks cover this implementation. Remaining release work includes user/device motion review, testing QR/camera/BLE lifecycle on both phones, performance and thermal profiling, native release packaging/R8 checks, cloud-build validation and iOS implementation. No claim of universal phone compatibility or completed production readiness is made.

## Current motion validation

The refreshed library includes the articulated hand and staged-reload implementation. Unity checks pass at simulated 15/30/60/120 FPS for aim and recoil recovery, duplicate reload rejection, reload completion/cancellation, hand and magazine continuity, thirty finger joints and a model renderer budget below 120. The Android app's Java/Kotlin compilation passes against this refreshed export, and all 13 JavaScript connection/bridge tests pass. `dropzone-unity/Review/motion-review.mp4` is an offline render of the actual motion code and has been decoded successfully for file integrity.

No Samsung device was available over USB during this pass. No APK was created or installed. Actual A32/S8 frame rate, temperatures, camera/QR behavior and BLE continuity are still unmeasured; testing the new native code requires a connected phone and a later native installation.
