const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {fingerprint}=require('../scripts/unity-source-fingerprint.cjs');
test('native Unity fingerprint follows gameplay/HUD resources, not HTML preview edits',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'dropzone-source-test-'));
 try{
  fs.mkdirSync(path.join(root,'Assets/Scripts'),{recursive:true});fs.mkdirSync(path.join(root,'Assets/Resources'),{recursive:true});fs.mkdirSync(path.join(root,'Review'));
  fs.writeFileSync(path.join(root,'Assets/Scripts/Game.cs'),'class Game {}');const initial=fingerprint(root);
  fs.writeFileSync(path.join(root,'Review/preview.html'),'preview-only edit');assert.equal(fingerprint(root),initial);
  fs.writeFileSync(path.join(root,'Assets/Scripts/Game.cs'),'class Game { int health; }');const changed=fingerprint(root);assert.notEqual(changed,initial);
  fs.writeFileSync(path.join(root,'Assets/Resources/Hud.png'),'changed artwork');assert.notEqual(fingerprint(root),changed);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
