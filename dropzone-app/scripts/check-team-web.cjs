// Exercises the actual Expo web UI. Team requests use only the local API.
const fs=require('fs'),path=require('path'),os=require('os'),net=require('net');
const {spawn}=require('child_process');const WebSocket=require('ws');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const assert=(value,message)=>{if(!value)throw Error(message);};
(async()=>{
 const port=await new Promise(resolve=>{const server=net.createServer();server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolve(port));});});
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'dropzone-menu-qa-'));
 const chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--no-sandbox',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
 let ws;const errors=[],screenshots={};
 try{
  let targets;for(let i=0;i<40;i++){try{targets=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();break;}catch{await pause(200);}}
  ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.once('open',r));
  let seq=0;const pending=new Map();ws.on('message',raw=>{const m=JSON.parse(raw);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(p)m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
  const click=async label=>{for(let i=0;i<40;i++){if(await evaluate(`!!Array.from(document.querySelectorAll('[aria-label]')).find(e=>e.getAttribute('aria-label')===${JSON.stringify(label)})`))break;await pause(100);}return evaluate(`(()=>{const e=Array.from(document.querySelectorAll('[aria-label]')).find(e=>e.getAttribute('aria-label')===${JSON.stringify(label)});if(!e)throw Error('Missing button '+${JSON.stringify(label)});e.click();})()`);};
  const text=()=>evaluate('document.body.innerText');
  const capture=async name=>{const r=await send('Page.captureScreenshot',{format:'png'});const file=path.join(os.tmpdir(),'dropzone-menu-'+name+'.png');fs.writeFileSync(file,Buffer.from(r.data,'base64'));screenshots[name]=file;};
  const metrics=(width,height)=>send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
  await send('Page.enable');await send('Runtime.enable');await send('Emulation.setFocusEmulationEnabled',{enabled:true});
  const api=async(action,body)=>{const r=await fetch('http://localhost:4180/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Error(action+': '+JSON.stringify(d));return d;};
  const input=(label,value)=>evaluate(`(()=>{const e=document.querySelector('[aria-label="'+${JSON.stringify(label)}+'"]');if(!e)throw Error('Missing input');e.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.blur();})()`);
  const waitText=async value=>{for(let i=0;i<60;i++){if((await text()).includes(value))return;await pause(200);}throw Error('Missing '+value+' in '+await text());};
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`if(!sessionStorage.getItem('team-seed')){localStorage.clear();localStorage.setItem('dropzone_user',JSON.stringify({name:'Arena Captain',userId:'DZ-QA'}));localStorage.setItem('dropzone_username','Arena Captain');sessionStorage.setItem('team-seed','1');}const original=window.fetch.bind(window);window.fetch=async(...args)=>{const r=await original(...args);if(String(args[0]).endsWith('/setMedicalMode'))window.__medical=await r.clone().json();return r;};`});
  await metrics(844,390);await send('Page.navigate',{url:'http://localhost:4173'});await waitText('PLAY');await click('Play');await waitText('CHOOSE YOUR MODE');await click('TEAM DEATHMATCH, play');await waitText('INVITE YOUR SQUAD');await pause(500);
  let cred=await evaluate(`JSON.parse(localStorage.getItem('dropzone_team_party'))`);
  const leader=await api('getParty',cred),friend=await api('joinParty',{displayName:'Squad Medic',invite:leader.invite});await api('readyParty',{...friend.credentials,ready:true});
  await click('PAIR GUN');await waitText('02 / GUN SETUP');await click('Continue without gun');await waitText('Your squad is ready.');await capture('team-party-phone');
  const session=await api('createSession',{mode:'team',maxPlayers:40});
  const enemy=await api('createParty',{displayName:'Enemy Captain'}),enemy2=await api('joinParty',{displayName:'Enemy Medic',invite:enemy.invite});for(const m of [enemy,enemy2])await api('readyParty',{...m.credentials,ready:true});
  const ej=await api('joinTeamMatch',{...enemy.credentials,joinCode:session.joinCode,teamName:'Bravo'}),ea={...enemy.credentials,sessionId:session.sessionId,playerId:ej.me.playerId};
  await click('READY →');await input('Team game code',session.joinCode);await input('Team name','Alpha');await capture('team-code-phone');await click('ENTER GAME');await waitText('Waiting for game');await capture('team-lobby-phone');
  cred=await evaluate(`JSON.parse(localStorage.getItem('dropzone_team_party'))`);const fm=await api('getParty',friend.credentials),fa={...friend.credentials,sessionId:session.sessionId,playerId:fm.me.playerId};
  await api('startGame',{sessionId:session.sessionId});await waitText('TEAM KILLS');
  const hit=()=>api('processHit',{...ea,shooterId:ea.playerId,targetId:cred.playerId});await hit();await waitText('75 / 100 HP');await click('Open first aid');await waitText('WATCH EACH');await capture('medical-menu-phone');await click('Receive healing');await waitText('LET A TEAMMATE');await pause(500);await capture('medical-qr-phone');
  const offer=await evaluate('window.__medical');assert(offer.qr?.startsWith('DZHEAL:'),'Missing medical QR');await api('setMedicalMode',{...fa,mode:'scan'});await api('startHeal',{...fa,qr:offer.qr});
  const heartbeat=setInterval(()=>api('teamHeartbeat',fa).catch(()=>{}),500);
  try{await waitText('HEALING IN PROGRESS');assert(!await evaluate(`!!document.querySelector('[aria-label="Close first aid"]')`),'Healing screen can close');await hit();await waitText('50 / 100 HP');await capture('medical-countdown-phone');await waitText('100 / 100 HP');await pause(600);}finally{clearInterval(heartbeat);}
  const state=await(await fetch('http://localhost:4180/sessions/'+session.sessionId)).json();assert(state.players[fa.playerId].medkits===0,'Kit not consumed');assert(state.players[cred.playerId].medicalMode==='closed','Healing not closed');
  const ml=await api('createParty',{displayName:'Second Leader'});await api('readyParty',{...ml.credentials,ready:true});
  await evaluate(`localStorage.removeItem('dropzone_team_party');localStorage.setItem('dropzone_user',JSON.stringify({name:'Second Member',userId:'DZ-QA2'}));localStorage.setItem('dropzone_username','Second Member')`);
  await send('Page.reload');await waitText('PLAY');await click('Play');await waitText('CHOOSE YOUR MODE');await click('TEAM DEATHMATCH, play');await waitText('INVITE YOUR SQUAD');await pause(300);await click('JOIN A PARTY');await waitText('JOIN YOUR PARTY');await input('Party code',ml.party.inviteCode);await click('JOIN PARTY');await waitText('WAITING FOR YOUR LEADER');await click('PAIR GUN');await waitText('02 / GUN SETUP');await click('Continue without gun');await waitText('WAITING FOR LEADER');await capture('member-party-phone');
  const s2=await api('createSession',{mode:'team',maxPlayers:40});await api('joinTeamMatch',{...ml.credentials,joinCode:s2.joinCode,teamName:'Charlie'});await waitText('Waiting for game');await capture('member-lobby-phone');
  assert(errors.length===0,'Browser exceptions: '+errors.join('\n'));console.log(JSON.stringify({status:'passed',screenshots,exceptions:errors,verified:'Leader and member party flows; QR receive; five-second lock; incoming damage; healing completion. Actual local API. Camera/Bluetooth require device testing.'}));
  await send('Browser.close').catch(()=>{});
 }finally{if(ws)ws.close();chrome.kill('SIGTERM');}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
