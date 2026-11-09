const fs=require('fs'),path=require('path'),http=require('http'),os=require('os');
const {spawnSync,spawn}=require('child_process');
const apiUrl=process.env.EXPO_PUBLIC_API_URL||'http://localhost:4180';
process.env.EXPO_PUBLIC_API_URL=apiUrl;
let backend;
async function start(){
 if(apiUrl==='http://localhost:4180'){
  let ready=false;try{const r=await fetch(apiUrl+'/health');const data=await r.json();ready=data.features?.includes('team-first-aid-v1');}catch{}
  if(!ready){
   backend=spawn(process.execPath,[path.resolve(__dirname,'../../local-server/server.js')],{env:{...process.env,PORT:'4180',BIND_HOST:'127.0.0.1'},stdio:'inherit'});
   for(let i=0;i<40;i++){await new Promise(r=>setTimeout(r,100));try{const r=await fetch(apiUrl+'/health');if(r.ok&&(await r.json()).features?.includes('team-first-aid-v1')){ready=true;break;}}catch{}}
   if(!ready)throw Error('Local game server did not start on port 4180.');
  }
 }

const root=path.join(os.tmpdir(),'dropzone-pregame-web');
const apiStamp=path.join(root,'.api-url');
if(process.argv.includes('--rebuild')||!fs.existsSync(path.join(root,'index.html'))||!fs.existsSync(apiStamp)||fs.readFileSync(apiStamp,'utf8')!==apiUrl){
 const result=spawnSync(process.execPath,[require.resolve('expo/bin/cli'),'export','--platform','web','--output-dir',root],{cwd:path.resolve(__dirname,'..'),stdio:'inherit'});
 if(result.status!==0)throw Error('Web preview export failed.');
 fs.writeFileSync(apiStamp,apiUrl);
}
const types={'.html':'text/html','.js':'application/javascript','.png':'image/png','.jpeg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.ico':'image/x-icon','.mp3':'audio/mpeg'};
http.createServer((req,res)=>{
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);return res.end();}
 const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end('Not found');}
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
}).listen(Number(process.env.DROPZONE_PREVIEW_PORT||4173),'127.0.0.1',()=>console.log('Pre-game UI: http://localhost:'+(process.env.DROPZONE_PREVIEW_PORT||4173)));

}
function stop(){backend?.kill('SIGTERM');process.exit();}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
start().catch(e=>{console.error(e.message);backend?.kill('SIGTERM');process.exit(1);});
