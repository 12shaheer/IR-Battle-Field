# Motion review

`motion-review.mp4` is a seven-second, offline Unity render of the actual weapon and hand animation code. It is silent, has a neutral background instead of a live camera, and is not a device performance recording.

| Time | Action |
| --- | --- |
| 0–1.5 seconds | Walking sway |
| 1.5–3 seconds | Aim transition and three shots |
| 3–5 seconds | Support-hand reach, magazine extraction/insertion, charging handle, return |
| 5–6 seconds | Sprint pose |
| 6–7 seconds | Return to idle |

The PNGs show individual poses. Regenerate the video with `node scripts/render-unity-review.cjs` from `dropzone-app`. Raw frames are ignored by Git and are not part of the Android application.
