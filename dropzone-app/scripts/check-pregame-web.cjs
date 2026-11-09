// Exercises the actual Expo web UI. All game-server calls are mocked inside this isolated browser.
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
  const click=label=>evaluate(`(()=>{const e=Array.from(document.querySelectorAll('[aria-label]')).find(e=>e.getAttribute('aria-label')===${JSON.stringify(label)});if(!e)throw Error('Missing button '+${JSON.stringify(label)});e.click();})()`);
  const text=()=>evaluate('document.body.innerText');
  const capture=async name=>{const r=await send('Page.captureScreenshot',{format:'png'});const file=path.join(os.tmpdir(),'dropzone-menu-'+name+'.png');fs.writeFileSync(file,Buffer.from(r.data,'base64'));screenshots[name]=file;};
  const metrics=(width,height)=>send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
  await send('Page.enable');await send('Runtime.enable');await send('Emulation.setFocusEmulationEnabled',{enabled:true});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`
    if(!sessionStorage.getItem('pregame-seeded')){localStorage.clear();localStorage.setItem('dropzone_user',JSON.stringify({name:'Test Player',userId:'DZ-2048'}));sessionStorage.setItem('pregame-seeded','1');}
    window.__joinRequests=[];
    const originalFetch=window.fetch.bind(window);
    window.fetch=async(input,options)=>{
      const url=String(input);
      if((url.includes('dropzone-server-production') || url.includes('localhost:4180'))){
        if(url.endsWith('/joinSession')){
          const body=JSON.parse(options.body);window.__joinRequests.push(body);
          if(body.joinCode==='111111')return new Response(JSON.stringify({error:'Session not found'}),{status:404});
          return new Response(JSON.stringify({sessionId:'review-session',playerId:'review-player'}),{status:200});
        }
        return new Response(JSON.stringify({status:'waiting',players:{},events:[]}));
      }
      return originalFetch(input,options);
    };
    window.WebSocket=class {constructor(){this.readyState=0;}close(){this.readyState=3;}send(){}};
  `});
  await metrics(1280,720);await send('Page.navigate',{url:'http://localhost:4173'});
  for(let i=0;i<40;i++){await pause(250);if((await text()).includes('PLAY'))break;}
  assert((await text()).includes('Test Player'),'Saved profile missing from home');await pause(800);await capture('home');
  const transforms=()=>evaluate(`Array.from(document.querySelectorAll('div')).map(e=>getComputedStyle(e).transform).filter(t=>t!=='none').join('|')`);
  const beforeMotion=await transforms();await pause(800);assert(await transforms()!==beforeMotion,'Home motion effects are not advancing');
  const backdropScale=()=>evaluate(`(()=>{const img=Array.from(document.querySelectorAll('div')).find(e=>e.style.backgroundImage.includes('Main%20Menu')||e.style.backgroundImage.includes('Main Menu'));if(!img)throw Error('Home backdrop missing');let node=img;while(node&&getComputedStyle(node).transform==='none')node=node.parentElement;if(!node)throw Error('Animated backdrop missing');const m=new DOMMatrixReadOnly(getComputedStyle(node).transform);return Math.hypot(m.a,m.b);})()`);
  const initialScale=await backdropScale();assert(Math.abs(initialScale-1.055)<0.0001,'Unexpected home backdrop scale');await pause(12500);
  const effectIds=['home-orbit-0','home-chamber-scan','home-particle-0'];
  const effectStates=()=>evaluate(`Object.fromEntries(${JSON.stringify(effectIds)}.map(id=>{const e=document.querySelector('[data-testid="'+id+'"]');if(!e)throw Error('Missing home effect '+id);const s=getComputedStyle(e);return [id,s.transform+'|'+s.opacity];}))`);
  const continuingEffects=await effectStates();await pause(700);const laterEffects=await effectStates();
  for(const id of effectIds)assert(continuingEffects[id]!==laterEffects[id],id+' stopped after its initial cycle');
  assert(Math.abs(await backdropScale()-initialScale)<0.00001,'Home backdrop is still zooming');
  await click('Open player profile');await pause(300);assert((await text()).includes('EDIT PROFILE'),'Profile button did not open profile');
  assert(await evaluate(`document.querySelector('[aria-label="Profile username"]').readOnly`),'Profile username can be edited');
  await click('Back to home');await pause(6200);
  const returnedEffects=await effectStates();await pause(700);const returnedLaterEffects=await effectStates();
  for(const id of effectIds)assert(returnedEffects[id]!==returnedLaterEffects[id],id+' failed to loop after returning to the main menu');
  await click('Play');await pause(500);assert((await text()).includes('CHOOSE YOUR MODE'),'Play did not open modes');await capture('modes');
  const locked=await evaluate(`Array.from(document.querySelectorAll('[aria-disabled="true"]')).filter(e=>e.getAttribute('aria-label')?.includes('locked')).length`);assert(locked===1,'Expected only Zombies to be locked');
  await click('ZOMBIES, locked, coming soon');await pause(150);assert((await text()).includes('CHOOSE YOUR MODE'),'Locked mode navigated');
  await metrics(844,390);await pause(300);await capture('modes-phone');
  await click('SOLO BATTLE ROYALE, play');await pause(500);await capture('join-phone');
  assert(await evaluate(`document.querySelector('[aria-label="Username"]').value==='Test Player'`),'Saved name did not prefill join');
  const setInput=(label,value)=>evaluate(`(()=>{const e=Array.from(document.querySelectorAll('[aria-label]')).find(e=>e.getAttribute('aria-label')===${JSON.stringify(label)});e.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  assert(await evaluate(`document.querySelector('[aria-label="Username"]').readOnly`),'Saved join username can be edited');
  await setInput('Game code','111111');await click('Continue to gun QR');await pause(500);assert((await text()).includes('Game not found'),'Join failure was not shown');
  await setInput('Game code','123456');await click('Continue to gun QR');await pause(700);
  assert((await text()).includes('02 / GUN SETUP'),'Did not reach gun QR step');await capture('gun-qr-phone');
  const requests=await evaluate('window.__joinRequests');assert(requests.length===2&&requests[1].displayName==='Test Player'&&requests[1].joinCode==='123456','Join payload incorrect');
  // Simulate a fresh installation only in this disposable QA browser.
  await evaluate(`localStorage.removeItem('dropzone_user');localStorage.removeItem('dropzone_username')`);
  await send('Page.reload');await pause(1300);await click('Play');await pause(900);await click('SOLO BATTLE ROYALE, play');await pause(900);
  assert(!(await evaluate(`document.querySelector('[aria-label="Username"]').readOnly`)),'New username field is not editable');
  await setInput('Username','Arena Pilot');await evaluate(`document.querySelector('[aria-label="Username"]').blur()`);await pause(350);
  const savedNameState=await evaluate(`({saved:localStorage.getItem('dropzone_username'),value:document.querySelector('[aria-label="Username"]').value,readOnly:document.querySelector('[aria-label="Username"]').readOnly,body:document.body.innerText})`);
  assert(savedNameState.saved==='Arena Pilot'&&savedNameState.readOnly,'Completed username was not saved and locked: '+JSON.stringify(savedNameState));
  await capture('username-saved-phone');
  await send('Page.reload');await pause(1400);assert((await text()).includes('Arena Pilot'),'Saved username did not survive reload');
  await click('Play');await pause(900);await click('SOLO BATTLE ROYALE, play');await pause(900);
  assert(await evaluate(`document.querySelector('[aria-label="Username"]').readOnly&&document.querySelector('[aria-label="Username"]').value==='Arena Pilot'`),'Username was not locked after restart');
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await pause(1000);
  const reducedBefore=await transforms();await pause(800);assert(await transforms()===reducedBefore,'Reduced-motion setting did not stop ambient motion');
  assert(errors.length===0,'Browser exceptions: '+errors.join('\n'));
  console.log(JSON.stringify({status:'passed',lockedModes:locked,requests,screenshots,exceptions:errors,usernamePersistence:'first-entry save, profile lock and reload verified',motion:'individual rings/scan/particle loops verified beyond multiple cycles and on menu return; fixed backdrop and reduced motion verified',note:'Mocked game API. Native QR/Bluetooth not tested.'}));
  await send('Browser.close').catch(()=>{});
 }finally{if(ws)ws.close();chrome.kill('SIGTERM');}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
