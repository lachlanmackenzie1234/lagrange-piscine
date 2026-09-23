import { TRACKS, CUES, scoreFor, frequency, ambienceLevels } from './catalog.mjs';

const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:0));
export const DEFAULT_MIX = {music:.35,ambience:.55,effects:.6};
export const MAX_VOICES=32;
export function readMix(storage) {
  try { const saved=JSON.parse(storage.getItem('lagrange-quest.sound.mix.v1')||'{}');return Object.fromEntries(Object.entries(DEFAULT_MIX).map(([key,value])=>[key,Number.isFinite(saved[key])?clamp(saved[key]):value])); }
  catch { return {...DEFAULT_MIX}; }
}
function noiseBuffer(ctx) {
  const buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),data=buffer.getChannelData(0);let state=42019;
  for(let i=0;i<data.length;i++){state=(Math.imul(state,1664525)+1013904223)>>>0;data[i]=state/2147483648-1;}
  return buffer;
}
function target(param,value,ctx,seconds=.12){param.setTargetAtTime(value,ctx.currentTime,seconds);}

// Shared synthesis makes runtime cues and offline WAV exports the same sounds.
class VoiceBank {
  constructor(ctx,noise,limit=MAX_VOICES){this.ctx=ctx;this.noise=noise;this.limit=limit;this.voices=new Set();this.peak=0;}
  play(output,event,group='effect'){
    if(this.voices.size>=this.limit)return null;
    const ctx=this.ctx,start=Math.max(ctx.currentTime,event.time??ctx.currentTime),duration=Math.max(.025,event.duration??.2),instrument=event.instrument||'bell';
    const noisy=['noise','hat'].includes(instrument),amp=ctx.createGain(),filter=ctx.createBiquadFilter(),pan=ctx.createStereoPanner();
    const attack=event.attack??(instrument==='pad'?.24:instrument==='bass'?.012:noisy?.015:.006),release=event.release??(instrument==='bell'?.26:instrument==='pad'?.3:.045),end=start+duration+release;
    filter.type=event.filterType||'lowpass';filter.frequency.value=event.cutoff??({bell:3200,pulse:1850,bass:500,pluck:1700,pad:750,hat:4500,noise:1300}[instrument]||1800);filter.Q.value=event.q??.7;
    pan.pan.value=clamp(event.pan??0,-1,1);const gain=clamp(event.gain??.12,0,.5);
    amp.gain.setValueAtTime(.0001,start);amp.gain.linearRampToValueAtTime(Math.max(.0001,gain),start+Math.min(attack,duration*.4));
    const sustain=instrument==='bell'||instrument==='pluck'?.28:1;
    amp.gain.exponentialRampToValueAtTime(Math.max(.0001,gain*sustain),start+duration);
    amp.gain.exponentialRampToValueAtTime(.0001,end);
    filter.connect(amp);amp.connect(pan);pan.connect(output);
    const sources=[],nodes=[filter,amp,pan];
    if(noisy){const source=ctx.createBufferSource();source.buffer=this.noise;source.loop=true;source.connect(filter);source.start(start,(event.offset??.37)%2);source.stop(end);sources.push(source);}
    else{
      const source=ctx.createOscillator();source.type=event.wave||({pulse:'square',pluck:'triangle',pad:'triangle',bass:'triangle'}[instrument]||'sine');
      const hz=event.hz??frequency(event.note||'C5');source.frequency.setValueAtTime(hz,start);
      if(event.to)source.frequency.exponentialRampToValueAtTime(event.to,start+duration);
      source.connect(filter);source.start(start);source.stop(end);sources.push(source);
      if(instrument==='bell'){const overtone=ctx.createOscillator(),level=ctx.createGain();overtone.frequency.value=hz*2;level.gain.value=.14;overtone.connect(level);level.connect(filter);overtone.start(start);overtone.stop(end);sources.push(overtone);nodes.push(level);}
    }
    const entry={sources,nodes,group,end,clean:()=>{for(const node of [...sources,...nodes])node.disconnect();this.voices.delete(entry);},stop:()=>{for(const source of sources)try{source.stop();}catch{}entry.clean();}};
    sources[0].onended=entry.clean;this.voices.add(entry);this.peak=Math.max(this.peak,this.voices.size);return entry;
  }
  clear(){for(const voice of [...this.voices])voice.stop();}
}

function cueEvents(id,start=0,variation=0){
  const events=[],tone=(dt,hz,duration,gain=.14,extra={})=>events.push({time:start+dt,hz,duration,gain,instrument:'sine',...extra}),noise=(dt,duration,gain,cutoff,extra={})=>events.push({time:start+dt,duration,gain,cutoff,instrument:'noise',...extra});
  const shift=1+variation*.035;
  switch(id){
    case 'select': tone(0,523.25,.06,.12);tone(.07,783.99,.09,.08);break;
    case 'grass-step': noise(0,.075,.11,1400,{filterType:'bandpass',q:.55,offset:variation+1});tone(0,115*shift,.045,.025,{to:65});break;
    case 'stone-step': tone(0,210*shift,.055,.12,{to:80});noise(0,.026,.035,2500);break;
    case 'rustle': noise(0,.22,.13,1150,{attack:.07,release:.12,filterType:'bandpass',q:.6});noise(.17,.22,.085,2200,{attack:.04,release:.15,pan:.2});break;
    case 'splash': noise(0,.25,.19,1450,{attack:.035,release:.18});tone(.05,490,.08,.07,{to:230});tone(.18,720,.1,.045,{to:400});break;
    case 'door': tone(0,125,.075,.16,{to:70});noise(.09,.23,.045,800,{filterType:'bandpass',q:5});tone(.1,180,.23,.035,{wave:'triangle',to:110});break;
    case 'pump': tone(0,95,3.5,.047,{wave:'triangle',attack:.2,release:.35,cutoff:220});tone(0,190,3.5,.012,{attack:.2,release:.35});noise(.05,3.4,.065,650,{attack:.2,release:.3});break;
    case 'hose': noise(0,2.65,.15,2200,{attack:.17,release:.25,filterType:'bandpass',q:.45});break;
    case 'encounter': [493.88,587.33,739.99,659.25].forEach((hz,i)=>tone(i*.12,hz,.16,.13,{instrument:'pulse',cutoff:2000}));break;
    case 'net': noise(0,.23,.18,1000,{attack:.05,release:.1});tone(.15,380,.08,.05,{to:170});break;
    case 'brush': noise(0,.09,.13,1700,{filterType:'bandpass',q:1});noise(.13,.1,.12,1250,{filterType:'bandpass',q:1});break;
    case 'robot': tone(0,130,.37,.065,{wave:'triangle',to:190});[440,554.37,659.25].forEach((hz,i)=>tone(i*.1,hz,.065,.085));break;
    case 'burst': noise(0,.28,.15,1900,{attack:.03,release:.18});[380,570,820,1120].forEach((hz,i)=>tone(.08+i*.07,hz,.07,.06,{to:hz*1.6}));break;
    case 'hit': tone(0,155,.10,.19,{to:60});noise(0,.06,.085,1100);break;
    case 'win': ['G4','B4','D5','A5','G5'].forEach((n,i)=>tone(i*.16,frequency(n),i===4?.48:.17,.15,{instrument:'bell'}));break;
    case 'lose': ['E5','D5','A4','G4'].forEach((n,i)=>tone(i*.2,frequency(n),.28,.10,{instrument:'bell'}));break;
  }
  return events;
}

export class Soundscape {
  constructor({mix=DEFAULT_MIX,onChange=()=>{}}={}){
    this.mix=Object.fromEntries(Object.entries(DEFAULT_MIX).map(([name,value])=>[name,Number.isFinite(mix[name])?clamp(mix[name]):value]));this.onChange=onChange;this.enabled=false;this.disposed=false;this.background=false;this.selection='auto';this.scene='garden';this.env={wind:.35,water:.55,rain:0,mood:'golden',active:true};this.cueTimes=new Map();this.cuesAccepted={};this.listener={x:256,y:192};this.sequence=0;this.pendingCleanups=new Set();this.beds=[];
  }
  initialize(){
    const Context=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Context)throw new Error('This browser does not support the sound preview.');
    this.ctx=new Context({latencyHint:'interactive'});this.noise=noiseBuffer(this.ctx);this.bank=new VoiceBank(this.ctx,this.noise);
    this.master=this.ctx.createGain();this.master.gain.value=0;const limiter=this.ctx.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=18;limiter.ratio.value=3;limiter.attack.value=.003;limiter.release.value=.2;this.master.connect(limiter);limiter.connect(this.ctx.destination);
    this.buses={};for(const name of Object.keys(DEFAULT_MIX)){const bus=this.ctx.createGain();bus.gain.value=clamp(this.mix[name]);bus.connect(this.master);this.buses[name]=bus;}
    const delay=this.ctx.createDelay(.6),echo=this.ctx.createGain(),feedback=this.ctx.createGain(),low=this.ctx.createBiquadFilter();delay.delayTime.value=.18;echo.gain.value=.13;feedback.gain.value=.18;low.frequency.value=1700;
    this.buses.music.connect(delay);delay.connect(low);low.connect(echo);echo.connect(this.master);low.connect(feedback);feedback.connect(delay);
    this.beds=[];this.track=null;
  }
  async enable(){
    if(this.disposed)return false;
    ++this.sequence;if(!this.ctx)this.initialize();this.enabled=true;
    try{await this.ctx.resume();if(this.disposed||!this.enabled||this.background)return false;if(this.ctx.state!=='running')throw new Error('Tap Enable sound again to resume audio.');this._start();target(this.master.gain,.72,this.ctx,.04);this.onChange();return true;}
    catch(error){this.enabled=false;this.onChange();throw error;}
  }
  async disable(){
    this.enabled=false;const sequence=++this.sequence;clearInterval(this.timer);this.timer=null;this.onChange();
    if(!this.ctx||this.ctx.state==='closed')return;
    target(this.master.gain,0,this.ctx,.012);await new Promise(resolve=>setTimeout(resolve,65));
    if(sequence!==this.sequence||this.disposed)return;this._stop();await this.ctx.suspend();this.onChange();
  }
  async setBackground(hidden){
    this.background=hidden;if(!this.ctx||!this.enabled||this.disposed)return;
    if(hidden){++this.sequence;clearInterval(this.timer);this.timer=null;this.master.gain.setValueAtTime(0,this.ctx.currentTime);this._stop();await this.ctx.suspend();if(!this.background&&this.enabled&&!this.disposed)await this.enable();}
    else {await this.enable();}
    this.onChange();
  }
  setMix(name,value){if(!(name in DEFAULT_MIX))return;this.mix[name]=clamp(value);if(this.ctx)target(this.buses[name].gain,this.mix[name],this.ctx,.05);this._syncTrack();this.onChange();}
  setMusic(id){if(id!=='auto'&&id!=='off'&&!TRACKS[id])return;this.selection=id;this._syncTrack();this.onChange();}
  setScene(scene){this.scene=scene;this._syncTrack();this._updateBeds();this.onChange();}
  setEnvironment(patch){this.env={...this.env,...patch};this._syncTrack();this._updateBeds();}
  resolvedTrack(){if(this.selection==='off'||!this.mix.music||this.scene==='result')return null;return this.selection==='auto'?(this.scene==='battle'?'battle':this.env.mood==='dusk'?'dusk':'garden'):this.selection;}
  _start(){
    if(!this.beds.length)for(const [name,type,cutoff,q] of [['wind','lowpass',620,.7],['water','bandpass',1250,.65],['rain','highpass',1100,.7]]){
      const source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),gain=this.ctx.createGain();source.buffer=this.noise;source.loop=true;filter.type=type;filter.frequency.value=cutoff;filter.Q.value=q;gain.gain.value=0;source.connect(filter);filter.connect(gain);gain.connect(this.buses.ambience);source.start(0,this.beds.length*.57);this.beds.push({name,source,filter,gain});
    }
    this.nextBird=this.ctx.currentTime+3;this.nextBedUpdate=0;this._syncTrack();if(!this.timer)this.timer=setInterval(()=>this._tick(),80);this._tick();
  }
  _stop(){
    clearInterval(this.timer);this.timer=null;this.bank?.clear();
    for(const bed of this.beds){try{bed.source.stop();}catch{}bed.source.disconnect();bed.filter.disconnect();bed.gain.disconnect();}this.beds=[];
    if(this.musicRun)this.musicRun.disconnect();this.musicRun=null;this.track=null;
    for(const item of this.pendingCleanups){clearTimeout(item.timer);item.node.disconnect();}this.pendingCleanups.clear();
  }
  _syncTrack(){
    if(!this.enabled||this.background||!this.ctx||this.ctx.state!=='running')return;
    const id=this.resolvedTrack();if(id===this.track)return;
    const now=this.ctx.currentTime;
    if(this.musicRun){const old=this.musicRun;target(old.gain,0,this.ctx,.06);const item={node:old,timer:null};item.timer=setTimeout(()=>{old.disconnect();this.pendingCleanups.delete(item);},400);this.pendingCleanups.add(item);}
    this.track=id;this.musicRun=null;
    if(id){this.score=scoreFor(id);this.musicRun=this.ctx.createGain();this.musicRun.gain.setValueAtTime(.001,now);this.musicRun.gain.linearRampToValueAtTime(1,now+.5);this.musicRun.connect(this.buses.music);this.origin=now+.05;this.cursor=0;this.loop=0;}
    this.onChange();
  }
  _updateBeds(){
    if(!this.ctx||!this.beds?.length)return;const levels=ambienceLevels(this.env,this.scene==='battle'),now=this.ctx.currentTime;
    for(const bed of this.beds){const wave=bed.name==='wind'?.88+.12*Math.sin(now*.43):bed.name==='water'?.9+.1*Math.sin(now*.73):1;target(bed.gain.gain,levels[bed.name]*wave,this.ctx,.35);if(bed.name==='wind')target(bed.filter.frequency,350+clamp(this.env.wind)*1000,this.ctx,.35);}
  }
  _tick(){
    if(!this.enabled||this.background||this.ctx.state!=='running')return;const now=this.ctx.currentTime;
    if(this.musicRun&&this.track){
      let next=this.origin+this.loop*this.score.duration+this.score.events[this.cursor].time;
      if(next<now-.25){this.origin=now+.04;this.cursor=0;this.loop=0;next=this.origin;}
      while(next<now+.18){const event=this.score.events[this.cursor];this.bank.play(this.musicRun,{...event,time:next},'music');this.cursor++;if(this.cursor===this.score.events.length){this.cursor=0;this.loop++;}next=this.origin+this.loop*this.score.duration+this.score.events[this.cursor].time;}
    }
    if(now>=this.nextBedUpdate){this._updateBeds();this.nextBedUpdate=now+.32;}
    if(now>=this.nextBird&&this.mix.ambience&&this.env.active&&this.scene!=='battle'){
      if(this.env.mood==='dusk'){for(let i=0;i<3;i++)this.bank.play(this.buses.ambience,{time:now+i*.13,hz:3600,to:3300,duration:.035,gain:.019,cutoff:5000,pan:-.45},'nature');}
      else if(this.env.rain<.45){const hz=1600+(Math.sin(now)*.5+.5)*450;for(let i=0;i<2;i++)this.bank.play(this.buses.ambience,{time:now+i*.16,hz,to:hz*1.6,duration:.08,gain:.035,cutoff:4000,pan:Math.sin(now*.6)*.55},'nature');}
      this.nextBird=now+(this.env.mood==='dusk'?3.5:7)+(Math.sin(now*.79)*.5+.5)*5;
    }
  }
  playCue(id,position=null){
    if(!CUES[id]||!this.enabled||this.background||!this.ctx||this.ctx.state!=='running'||!this.mix.effects)return false;
    const now=this.ctx.currentTime,cooldown=id.endsWith('step')?.12:id==='select'?.07:id==='pump'||id==='hose'?1:.1;
    if(now-(this.cueTimes.get(id)??-Infinity)<cooldown)return false;this.cueTimes.set(id,now);
    this.cuesAccepted[id]=(this.cuesAccepted[id]||0)+1;
    const pan=position?clamp((position.x-this.listener.x)/240,-.65,.65):0;
    for(const event of cueEvents(id,now+.005,Math.sin(now*17)))this.bank.play(this.buses.effects,{...event,pan:(event.pan||0)+pan},'effect');return true;
  }
  snapshot(){return {enabled:this.enabled,state:this.ctx?.state||'uninitialized',background:this.background,selection:this.selection,track:this.track||null,mix:{...this.mix},voices:this.bank?.voices.size||0,peakVoices:this.bank?.peak||0,ambientBeds:this.beds?.length||0,timerActive:!!this.timer,noiseBytes:this.noise?this.noise.length*4:0,environment:{...this.env},cuesAccepted:{...this.cuesAccepted}};}
  async dispose(){if(this.disposed)return;this.disposed=true;this.enabled=false;++this.sequence;this._stop();if(this.ctx&&this.ctx.state!=='closed')await this.ctx.close();}
}

export async function renderAsset(kind,id,sampleRate=22050){
  const Offline=globalThis.OfflineAudioContext||globalThis.webkitOfflineAudioContext;if(!Offline)throw new Error('Offline audio export is unavailable.');
  const score=kind==='music'?scoreFor(id):null;if(!score&&!CUES[id])throw new Error('Unknown audio asset');
  const duration=score?score.duration:CUES[id].duration+.25,offset=score?duration:0;
  const ctx=new Offline(2,Math.ceil((duration+offset+.5)*sampleRate),sampleRate),gain=ctx.createGain();gain.gain.value=.9;gain.connect(ctx.destination);
  const bank=new VoiceBank(ctx,noiseBuffer(ctx),Infinity);
  if(score)for(let loop=0;loop<2;loop++)for(const event of score.events)bank.play(gain,{...event,time:event.time+loop*duration},'music');
  else for(const event of cueEvents(id,.01))bank.play(gain,event);
  const audio=await ctx.startRendering(),start=Math.round(offset*sampleRate),frames=Math.round(duration*sampleRate);
  const channels=[0,1].map(c=>audio.getChannelData(c).slice(start,start+frames));return {sampleRate,channels,duration};
}
export function wavBytes({sampleRate,channels}){
  const frames=channels[0].length,count=channels.length,bytes=new ArrayBuffer(44+frames*count*2),view=new DataView(bytes),text=(at,value)=>[...value].forEach((c,i)=>view.setUint8(at+i,c.charCodeAt(0)));
  text(0,'RIFF');view.setUint32(4,36+frames*count*2,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,count,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*count*2,true);view.setUint16(32,count*2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,frames*count*2,true);
  for(let i=0;i<frames;i++)for(let c=0;c<count;c++){const value=clamp(channels[c][i],-1,1);view.setInt16(44+(i*count+c)*2,Math.round(value*(value<0?32768:32767)),true);}return new Uint8Array(bytes);
}
