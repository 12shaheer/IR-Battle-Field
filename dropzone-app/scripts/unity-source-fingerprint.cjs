const fs=require('fs'),path=require('path'),crypto=require('crypto');
function fingerprint(project){
 const hash=crypto.createHash('sha256');
 const visit=relative=>{const absolute=path.join(project,relative);if(!fs.existsSync(absolute))return;
  if(fs.statSync(absolute).isDirectory()){for(const child of fs.readdirSync(absolute).sort())if(!child.startsWith('.'))visit(path.join(relative,child));}
  else{hash.update(relative.split(path.sep).join('/'));hash.update('\0');hash.update(fs.readFileSync(absolute));hash.update('\0');}
 };
 for(const relative of ['Assets/Scripts','Assets/Resources','Assets/link.xml','Packages/manifest.json'])visit(relative);
 return hash.digest('hex');
}
module.exports={fingerprint};
