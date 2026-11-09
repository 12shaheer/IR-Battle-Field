const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),babel=require('@babel/core');
function storage(seed={}) {
 const items=new Map(Object.entries(seed));
 const AsyncStorage={getItem:async key=>items.get(key)||null,setItem:async(key,value)=>{items.set(key,value);},removeItem:async key=>{items.delete(key);}};
 const file=path.resolve(__dirname,'../src/utils/storage.js');
 const code=babel.transformSync(fs.readFileSync(file,'utf8'),{babelrc:false,configFile:false,plugins:[require.resolve('@babel/plugin-transform-modules-commonjs')]}).code;
 const module={exports:{}};vm.runInNewContext(`(function(require,module,exports){${code}\n})`,{})(()=>({__esModule:true,default:AsyncStorage}),module,module.exports);
 return {api:module.exports,items};
}
test('first completed username persists and later profile saves cannot rename it',async()=>{
 const {api,items}=storage();
 assert.equal(await api.lockUsername('  Arena Pilot  '),'Arena Pilot');
 await api.saveUser({name:'Another Name',avatarUri:'file://avatar',gender:'female'});
 const user=await api.getUser();assert.equal(user.name,'Arena Pilot');assert.equal(user.avatarUri,'file://avatar');assert.equal(user.usernameLocked,true);
 const afterRestart=storage(Object.fromEntries(items)).api;assert.equal((await afterRestart.getUser()).name,'Arena Pilot');
});
test('simultaneous first-name writes keep one canonical username',async()=>{
 const {api}=storage();const result=await Promise.all([api.lockUsername('First Pilot'),api.lockUsername('Second Pilot')]);
 assert.equal(result[0],'First Pilot');assert.equal(result[1],'First Pilot');
});
test('clearing match/profile data does not unlock the username',async()=>{
 const {api}=storage();await api.saveUser({name:'Persistent Pilot'});await api.saveSession('match','player');await api.clearSession();await api.clearUser();
 assert.equal(await api.lockUsername('Replacement'),'Persistent Pilot');assert.equal((await api.getUser()).name,'Persistent Pilot');
});
test('existing saved profiles migrate to locked names',async()=>{
 const {api}=storage({dropzone_user:JSON.stringify({name:'Existing Pilot',userId:'USER42'})});
 assert.equal((await api.getUser()).usernameLocked,true);await api.saveUser({name:'Changed',gender:'male'});
 const saved=await api.getUser();assert.equal(saved.name,'Existing Pilot');assert.equal(saved.userId,'USER42');
});
test('incomplete names do not reserve identity and a later valid write succeeds',async()=>{
 const {api}=storage();await assert.rejects(api.lockUsername('x'),/2–20/);assert.equal(await api.getUser(),null);assert.equal(await api.lockUsername('Valid Pilot'),'Valid Pilot');
});
