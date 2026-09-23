import test from 'node:test';
import assert from 'node:assert/strict';
import {TRACKS,scoreFor,frequency,ambienceLevels} from './audio/catalog.mjs';
import {readMix,DEFAULT_MIX,wavBytes} from './audio/engine.mjs';

test('original scores contain ordered, bounded, playable events within each loop',()=>{
  for(const id of Object.keys(TRACKS)){
    const score=scoreFor(id);assert.ok(score.duration>15&&score.duration<35);assert.ok(score.events.length>60);
    for(let i=0;i<score.events.length;i++){
      const e=score.events[i];assert.ok(e.time>=0&&e.time<score.duration);assert.ok(e.duration>0&&e.duration<4);
      assert.ok(e.gain>0&&e.gain<.3);assert.ok(frequency(e.note)>20&&frequency(e.note)<5000);
      if(i)assert.ok(e.time>=score.events[i-1].time);
    }
  }
  assert.equal(frequency('A4'),440);assert.equal(frequency('B♭4'),frequency('A#4'));assert.throws(()=>frequency('invalid'));
});
test('weather ambience is bounded, can turn off, and ducks during encounters',()=>{
  const calm=ambienceLevels({wind:0,water:0,rain:0}),storm=ambienceLevels({wind:1,water:1,rain:1});
  assert.ok(storm.wind>calm.wind&&storm.water>calm.water);assert.equal(calm.rain,0);
  assert.deepEqual(ambienceLevels({active:false}),{wind:0,water:0,rain:0});
  const duck=ambienceLevels({wind:1,water:1,rain:1},true);assert.ok(Object.keys(duck).every(k=>duck[k]<storm[k]));
  const invalid=ambienceLevels({wind:Infinity,water:-20,rain:NaN});assert.ok(Object.values(invalid).every(n=>Number.isFinite(n)&&n>=0&&n<.2));
});
test('mix preferences survive malformed storage and never imply autoplay',()=>{
  assert.deepEqual(readMix({getItem:()=>'{bad'}),DEFAULT_MIX);
  assert.deepEqual(readMix({getItem:()=>JSON.stringify({music:4,ambience:-1,effects:null,enabled:true})}),{music:1,ambience:0,effects:.6});
});
test('WAV export carries correct stereo timing and bounded PCM samples',()=>{
  const bytes=wavBytes({sampleRate:22050,channels:[new Float32Array([-2,0,2]),new Float32Array([.5,-.5,0])]}),view=new DataView(bytes.buffer);
  assert.equal(new TextDecoder().decode(bytes.slice(0,4)),'RIFF');assert.equal(view.getUint32(24,true),22050);assert.equal(view.getUint32(40,true),12);
  assert.equal(view.getInt16(44,true),-32768);assert.equal(view.getInt16(52,true),32767);assert.equal(bytes.length,56);
});
