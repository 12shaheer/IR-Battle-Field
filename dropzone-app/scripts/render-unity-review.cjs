const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const project = path.resolve(__dirname, '../../dropzone-unity');
const editor = process.env.DROPZONE_UNITY_EDITOR || '/Applications/Unity/Hub/Editor/6000.5.6f1';
const log = path.join(os.tmpdir(), 'dropzone-motion-review.log');
function run(command, args) {
  const result = spawnSync(command, args, { cwd: project, stdio: 'inherit' });
  if (result.error || result.status !== 0) throw new Error(`${command} failed. ${result.error?.message || ''}`);
}
try {
  if (!process.argv.includes('--encode-only')) run(path.join(editor, 'Unity.app/Contents/MacOS/Unity'), ['-batchmode', '-quit', '-projectPath', project, '-executeMethod', 'DropZoneSetup.CaptureMotionFrames', '-logFile', log]);
  const labels = [['WALK',0,1.5],['AIM + FIRE',1.5,3],['STAGED RELOAD',3,5],['SPRINT',5,6],['IDLE',6,7]];
  const filter = labels.map(([text,start,end]) => `drawtext=fontfile=/System/Library/Fonts/Supplemental/Arial.ttf:text='${text}':fontcolor=0x9deeff:fontsize=24:x=28:y=26:enable='between(t,${start},${end})'`).join(',');
  const filters = spawnSync('/usr/local/bin/ffmpeg', ['-hide_banner', '-filters'], { encoding: 'utf8' });
  const overlay = filters.stdout?.includes('drawtext') ? ['-vf', filter] : [];
  const encoders = spawnSync('/usr/local/bin/ffmpeg', ['-hide_banner', '-encoders'], { encoding: 'utf8' });
  const codec = encoders.stdout?.includes('libx264') ? ['-c:v', 'libx264', '-crf', '20'] : ['-c:v', 'h264_videotoolbox', '-b:v', '4M'];
  run('/usr/local/bin/ffmpeg', ['-hide_banner','-loglevel','error','-y','-framerate','30','-i','Review/frames/%04d.png','-frames:v','210',...overlay,...codec,'-pix_fmt','yuv420p','-movflags','+faststart','Review/motion-review.mp4']);
  console.log('Rendered Review/motion-review.mp4. Offline motion review only; no phone test or APK.');
} catch(error) { console.error(error.message); console.error(`Unity log: ${log}`);process.exitCode=1; }
