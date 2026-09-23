import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fullSetFor,activeAuras,frameAt,auraLayers,characterClip,EQUIPMENT_SLOTS,SET_IDS,RARITIES} from './runtime.mjs';
const m=JSON.parse(readFileSync(new URL('./manifest.json',import.meta.url),'utf8'));
let checks=0;
for(const set of SET_IDS){
  const equipment=Object.fromEntries(EQUIPMENT_SLOTS.map(slot=>[slot,{res:set}]));
  assert.equal(fullSetFor(equipment),set);checks++;
  assert.deepEqual(activeAuras({role:'player',motion:'idle',equipment}),['set-'+set]);checks++;
  for(const patch of [{moving:true},{motion:'walk'},{motion:'cast'},{action:'perche'},{alive:false},{visible:false}]){
    assert.deepEqual(activeAuras({role:'player',motion:'idle',equipment,...patch}),[]);checks++;
  }
  const missing={...equipment};delete missing.balai;assert.equal(fullSetFor(missing),null);checks++;
  assert.equal(fullSetFor({...equipment,balai:{res:set==='EC'?'AG':'EC'}}),null);checks++;
  const layers=auraLayers(m,{role:'player',equipment,motion:'idle'},300);
  assert.deepEqual(layers.map(l=>l.layer),['back','front']);checks++;
  for(const dir of ['south','east','west','north'])for(const motion of ['idle','walk','cast','hit','victory','spawn','defeat','flee','crouch']){
    assert.ok(m.clips[characterClip(set,dir,motion)]);checks++;
  }
}
for(const rarity of RARITIES){
  assert.deepEqual(activeAuras({role:'monster',rarity,motion:'idle'}),['rarity-'+rarity]);checks++;
  assert.deepEqual(activeAuras({role:'monster',rarity,motion:'walk'}),[]);checks++;
  assert.deepEqual(activeAuras({role:'monster',rarity,moving:true}),[]);checks++;
  assert.deepEqual(activeAuras({role:'monster',rarity,action:'attack'}),[]);checks++;
}
assert.deepEqual(activeAuras({role:'creature'}),[]);checks++;
assert.deepEqual(activeAuras({role:'monster',rarity:'not-a-tier'}),[]);checks++;
for(const [id,clip]of Object.entries(m.clips)){
  let t=0;
  for(let i=0;i<clip.frames.length;i++){
    assert.equal(frameAt(m,id,t).index,i,id+' frame boundary');
    assert.equal(frameAt(m,id,t+clip.frames[i].durationMs-1).index,i);t+=clip.frames[i].durationMs;checks+=2;
  }
  assert.equal(t,clip.durationMs);checks++;
  if(clip.loop){assert.equal(frameAt(m,id,t).index,0);assert.equal(frameAt(m,id,t).finished,false);}
  else{assert.equal(frameAt(m,id,t).finished,true);assert.equal(frameAt(m,id,t).index,clip.frames.length-1);}
  const reduced=frameAt(m,id,20,{reducedMotion:true});assert.deepEqual(reduced.offset,[0,0]);assert.equal(reduced.index,clip.reducedMotionFrame);checks+=4;
  if(clip.disappearOnEnd){assert.equal(frameAt(m,id,t,{reducedMotion:true}).index,clip.frames.length-1);checks++;}
}
assert.throws(()=>frameAt(m,'missing'));assert.throws(()=>characterClip('bad','north'));checks+=2;
console.log(JSON.stringify({passed:true,checks,auraGating:'pass',frameTiming:'pass',reducedMotion:'pass'}));
