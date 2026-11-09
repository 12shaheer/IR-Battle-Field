# Pre-game artwork and motion

The mode cards now use original generated illustrations, rather than screenshots. All artwork below was generated with the built-in image-generation tool, using `zombies.png` only as a style reference. The existing clean home background remains `../Main Menu background image.jpeg`.

Current assets:

- `solo.png` — Solo Battle Royale card and full join-screen backdrop.
- `team.png` — Team Deathmatch card (locked).
- `zombies.png` — Zombies card (locked), retained from the previous generation.
- `play-banner.png` — illustration inside the vector Play panel. Rounded/stepped borders, controller symbols and the lime button are actual UI graphics.

## Final prompt set for the new artwork

### solo.png

Use case: stylized-concept. Asset type: landscape 3:2 game illustration. The attached image is a STYLE REFERENCE ONLY: match the polished 3D arcade toy-robot art, chunky rounded armor, rich cyan/violet lighting, expressive glowing eyes, crisp cinematic detail. Create new original characters and composition, not the zombie scene. No text, no letters, no UI, no border, no watermark. Fill edge to edge. SOLO BATTLE ROYALE: one heroic compact robot survivor with white/graphite armor, lime accents and a single glowing orange cyclops eye, holding a futuristic laser blaster, standing on the LEFT third of the composition above a colorful futuristic rooftop arena, a cyan energy ring sweeping through the distant city, floating debris. Low-angle dramatic shot. Keep the RIGHT half mostly atmospheric city and sky for a readable overlaid join form. No other foreground heroes.

### team.png

Use case: stylized-concept. Asset type: landscape 3:2 game illustration. The attached image is a STYLE REFERENCE ONLY: match the polished 3D arcade toy-robot art, chunky rounded armor, rich cyan/violet lighting, expressive glowing eyes, crisp cinematic detail. Create new original characters and composition, not the zombie scene. No text, no letters, no UI, no border, no watermark. Fill edge to edge. TEAM DEATHMATCH: a coordinated team of three heroic compact sci-fi robots with cyan, magenta and white armor charging together through an angular futuristic city arena, colorful laser streaks, dynamic diagonal composition, teamwork pose, no blood, no gore. Keep the heroes grouped on the LEFT and CENTER, with atmospheric city and sky on the RIGHT for a readable overlaid form.

### play-banner.png

Use case: stylized-concept. Asset type: landscape 3:2 game illustration. The attached image is a STYLE REFERENCE ONLY: match the polished 3D arcade toy-robot art, chunky rounded armor, rich cyan/violet lighting, expressive glowing eyes, crisp cinematic detail. Create new original characters and composition, not the zombie scene. No text, no letters, no UI, no border, no watermark. Fill edge to edge. PLAY BANNER: a wide-feeling dynamic close-up of two compact heroic sci-fi robot contenders, one white/graphite with a glowing orange cyclops eye and one purple/cyan with lime accents, aiming futuristic laser blasters toward an offscreen arena, energetic cyan/purple city background and vivid lime energy streaks. Composition must remain readable when cropped to a very wide shallow banner. Concentrate the characters in the center-right; atmospheric dark purple negative space on the left. This is only illustration inside a carefully shaped Play button, so do NOT draw the button, text, frame, or icons.

## Preview and validation

Run `npm run preview:pregame -- --rebuild` in the app directory. Browser checks: `node scripts/check-pregame-web.cjs`. The game API is mocked only in the isolated QA browser, so those checks do not join a real game.

The first completed username is stored separately from profile/session data and becomes read-only. Existing saved names migrate to that lock. Storage tests cover subsequent edits, concurrent first writes, profile clearing and app restart.

Motion includes a fixed home background with no camera drift or zoom, counter-rotating holographic chamber rings, a sweeping scan band, expanding floor pulses, 18 rising energy particles. Other screens retain their existing ambient motion, staggered card/form entrances, spring feedback on Play and native slide transitions. Animations stop when a screen loses focus and respect the system reduced-motion preference.

Native QR scanning and Bluetooth pairing require phone testing. No APK is built and Unity gameplay is unchanged.

Home orbit/scan loops use explicit infinite iterations: native animation driver on mobile, browser-compatible JavaScript driver on web. The left-to-right light sweep is removed. Browser checks sample individual rings, scan and particles after multiple cycles and after returning to the main menu.
