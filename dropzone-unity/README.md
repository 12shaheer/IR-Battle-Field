# DropZone Unity camera gameplay

Unity 6000.5.6f1 camera-gameplay source, with an Android library bridge in the React Native app. No APK has been created by this workflow.

Open this folder in Unity Hub. Use **DropZone → Create camera gameplay scene**, then open `Assets/Scenes/CameraGameplay.unity` and press Play. Allow camera access when prompted. A Mac camera previews the background; Android uses the rear camera when available.

## Gameplay and motion

Original procedural DZ-01 blaster with beveled geometry, reflex sight, independent magazine and charging handle; articulated gloves with 30 finger joints, tapered sleeves, cuff and knuckle details; generated materials; synthesized discharge, latch and hit sounds. Idle breathing, sensor/keyboard walking sway, blended sprint lowering, aim transition, analytical spring recoil, trigger-finger movement, muzzle illumination, pooled muzzle flare/heat particles, pooled shell casings and damage feedback. Camera feed crops to fill with rotation/mirroring correction. No downloaded art or paid packages.

Reloads have separate reach, extraction, insertion, charging-handle and recovery phases. The support hand moves independently of the magazine, charging-handle motion follows the hand, and interrupted reloads restore the grip and magazine. Static weapon geometry is batched by material, and generated meshes/materials are released on teardown. Touching aim/reload controls does not count as a desktop mouse shot.

See [the rendered motion review](Review/motion-review.mp4) and [review notes](Review/README.md). These are offline Unity renders rather than recordings from a phone.

Controls: left mouse fires, right mouse aims, WASD previews walking motion, Shift previews sprinting, R reloads. On-screen buttons provide mobile actions. Actual phone acceleration drives walking motion; sprint is an explicit toggle because acceleration alone cannot reliably distinguish walking from running.

## Scope and next steps

The hands use stylized geometry and procedural articulation. Production readiness is not established: motion feel, QR orientation, lifecycle behavior, camera/BLE coexistence and sustained performance require physical-device testing. Desktop permission prompts may require restarting Unity after access is granted.

The Android bridge lives in `../dropzone-app/native-unity` and `../dropzone-app/plugins/withDropZoneUnity.js`. Unity owns the gameplay camera and cyan HUD; bundled ML Kit scans its frames for battle tags. React Native retains BLE and server authority. Fire/reload requests, server state, hardware-shot presentation and hit confirmation cross the bridge. Gameplay now launches Unity automatically. The previous React camera HUD is removed. Builds without the native integration display an explanation; iOS Unity embedding is not implemented.

Use **DropZone → Export Android library (no APK)** to generate `../dropzone-app/unity-export`. Expo prebuild automatically links a complete export. Prebuild changes native configuration only; it does not install Unity into an already-installed app. The current export includes host-specific IL2CPP tools; EAS/Linux export portability is not validated. See the native integration README before attempting a release.

No APK is created by the library workflow. Unity's generated Library folder can become large.

## Refresh and validate without an APK

From `dropzone-app`, run `node scripts/refresh-unity-library.cjs --review-poses` to run the motion checks, render individual poses, export, compile and fingerprint the Android library. Run `node scripts/render-unity-review.cjs` to regenerate the motion-review video using the installed Unity Editor and ffmpeg. Expo prebuild must then refresh the native integration.

The editor checks exercise ADS/recoil recovery, reload completion and cancellation, pose continuity, joint count and renderer budget at simulated 15, 30, 60 and 120 FPS. Passing these checks does not measure device FPS or replace phone testing.
