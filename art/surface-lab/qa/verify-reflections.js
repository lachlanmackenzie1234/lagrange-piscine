/* White material highlights, reversible adaptive colour and bounded sound. */
(async()=>{
 const assert=(ok,msg)=>{if(!ok)throw Error(msg)},report={};
 const pause=ms=>new Promise(r=>setTimeout(r,ms)),wait=async fn=>{for(let i=0;i<150;i++){if(fn())return;await pause(50)}throw Error('Reflection controls timed out')};
 const c=document.createElement('canvas');c.width=512;c.height=384;const g=c.getContext('2d'),off={x:-50,y:-50},noop=()=>{};
 const pixels=()=>g.getImageData(0,0,512,384).data;
 const count=()=>{const d=pixels();let white=0,nonBinary=0;for(let i=0;i<d.length;i+=4){white+=d[i]===255;nonBinary+=![0,255].includes(d[i])||d[i]!==d[i+1]||d[i]!==d[i+2]}return{white,nonBinary}};
 const f=new TerrainStudy.Field({mode:'earth',wind:0,moisture:0,reflectionView:true,reflectKeeper:0,reflectionStrength:1});report.materials={};
 for(const type of SurfaceReflections.names){const key='reflect'+type[0].toUpperCase()+type.slice(1),values=[0,.1,.3,.6,1].map(v=>SurfaceReflections.response(type,1,{...f.options,[key]:v}).reflectance);assert(values.every((v,i)=>i===0||v>values[i-1]),'Wet reflectivity slider plateaus for '+type)}
 assert(SurfaceReflections.response('water',1,{...f.options,reflectionRoughness:.9}).roughness>SurfaceReflections.response('water',1,{...f.options,reflectionRoughness:.1}).roughness,'Water roughness control has no effect');
 for(const type of ['grass','sand','earth','gravel','water']){
  f.configure({mode:type,moisture:0});f.paint(g,off,noop,noop,true);const dry=count();
  f.configure({moisture:1});f.paint(g,off,noop,noop,true);const wet=count();
  assert(wet.white>2&&wet.nonBinary===0&&dry.nonBinary===0,type+' has no pure white highlight mask');
  if(type!=='water')assert(wet.white>dry.white,type+' has no wet-sheen response');
  const key='reflect'+type[0].toUpperCase()+type.slice(1),old=f.options[key];f.configure({[key]:0});f.paint(g,off,noop,noop,true);assert(count().white===0,type+' ignores its reflectivity control');f.configure({[key]:old});
  report.materials[type]={dry:dry.white,wet:wet.white,materialOff:true};
 }
 f.configure({reflectionStrength:0});f.paint(g,{x:260,y:270},noop,noop);assert(count().white===0,'Zero reflection strength leaves glints');
 f.configure({mode:'gravel',moisture:0,reflectionStrength:1,wind:1,pathWear:0,variation:0,edgeGrain:0});f.paint(g,off,noop,noop);const still=pixels();
 f.time+=3;f.paint(g,off,noop,noop);assert(pixels().every((v,i)=>v===still[i]),'Wind animates static gravel reflections');
 f.configure({mode:'water',moisture:0});f.paint(g,off,noop,noop);const wave=pixels();f.time+=3;f.paint(g,off,noop,noop);assert(pixels().some((v,i)=>v!==wave[i]),'Water highlights do not shimmer');
 f.weather.ice=f.water.ice=1;f.paint(g,off,noop,noop);const frozen=pixels();f.time+=3;f.paint(g,off,noop,noop);assert(pixels().every((v,i)=>v===frozen[i]),'Ice keeps animated highlights');
 f.configure({mode:'grass',wind:1});f.paint(g,off,noop,noop,true);const quiet=pixels();f.time+=3;f.paint(g,off,noop,noop,true);assert(pixels().every((v,i)=>v===quiet[i]),'Reduced motion shimmer');
 report.motion={gravelStatic:true,waterShimmers:true,iceStatic:true,reducedMotionStatic:true};
 const before=JSON.stringify(f.weather.snapshot()),base=f.base.toDataURL();
 const manual={palette:'coast',view:'colour',contrast:1.32,saturation:.99,exposure:1.02},saved=JSON.stringify(manual);
 const day=SurfaceAdaptiveColour.derive({hour:12,sun:.9,humidity:.4}),evening=SurfaceAdaptiveColour.derive({hour:18,sun:.9,humidity:.4}),night=SurfaceAdaptiveColour.derive({hour:1,sun:.9,humidity:.4});
 assert(evening.key[0]>evening.key[2]&&night.key[2]>night.key[0]&&day.exposure>night.exposure,'Warm evening / blue night response');
 assert(SurfaceAdaptiveColour.hour('2026-09-23T14:30:00Z')===16.5&&SurfaceAdaptiveColour.hour('2026-01-23T14:30:00Z')===15.5,'Recorded Paris time');
 f.configure({colourDriver:'weather',studyHour:18});assert(f.adaptive&&f.base.toDataURL()===base&&JSON.stringify(f.weather.snapshot())===before,'Adaptive lighting changes pigment or physics');
 const graded=SurfaceAdaptiveColour.grade(manual,f.adaptive,.75);assert(graded.exposure!==manual.exposure&&JSON.stringify(manual)===saved,'Automatic grade mutates manual base');
 f.configure({colourDriver:'manual'});assert(!f.adaptive&&JSON.stringify(SurfaceAdaptiveColour.grade(manual,null,1))===saved,'Manual mode does not restore its grade');
 f.configure({colourDriver:'recorded',observedHour:null});assert(!f.adaptive,'Missing record invents a time');f.applyWeatherRecord({at:'2026-09-23T14:30:00Z',temp:18,hum:55,precip:0,uv:7,wind:10});assert(f.adaptive.hour===16.5,'Recorded time not connected');
 f.applyWeatherRecord({temp:18,at:'invalid'});assert(f.options.observedHour===null&&!f.adaptive,'Invalid record retains a stale observation time');
 report.adaptive={evening:evening.key,night:night.key,reversible:true,physicsUnchanged:true,recordedTime:true,missingTimeSafe:true};
 report.budget=f.reflections.stats;assert(report.budget.sites<=3072&&report.budget.bytes===2359296,'Unbounded reflection working set');f.dispose();assert(f.reflections.stats.bytes===0&&f.reflections.stats.sites===0,'Reflection buffers survive disposal');
 const page=document.getElementById('terrain'),change=(id,value,event='input')=>{const e=document.getElementById(id);e.value=value;e.dispatchEvent(new Event(event,{bubbles:true}))};
 const storage=JSON.stringify({...localStorage});change('view','reflections','change');await wait(()=>page.dataset.reflectionView==='true');assert(page.style.filter==='none','Reflection mask is colour graded');
 change('reflection-strength',100);change('colour-driver','weather','change');change('study-hour',1);await wait(()=>page.dataset.colourDriver==='weather'&&+page.dataset.studyHour===1);
 const contrast=document.getElementById('contrast').value;change('study-hour',18);await wait(()=>+page.dataset.studyHour===18);assert(document.getElementById('contrast').value===contrast,'Adaptive driver overwrites a control');
 change('colour-driver','manual','change');change('view','colour','change');change('reflection-strength',65);
 assert(storage===JSON.stringify({...localStorage}),'Reflection controls write app data');report.controls=true;
 const audioModule=await SurfaceSound.ready,asset=await audioModule.renderAsset('effect','grass-step',22050);let energy=0,peak=0;for(const channel of asset.channels)for(const sample of channel){energy+=sample*sample;peak=Math.max(peak,Math.abs(sample))}
 assert(peak>0&&peak<1&&energy>0,'Provided audio recipe renders silence/clipping');
 assert(page.dataset.audioEnabled==='false'&&page.dataset.audioState==='uninitialized'&&+page.dataset.audioNoiseBytes===0,'Sound autostarts');
 report.audio={offByDefault:true,offlineFootstep:{duration:asset.duration,peak,energy},maxVoices:audioModule.MAX_VOICES};
 return report;
})()
