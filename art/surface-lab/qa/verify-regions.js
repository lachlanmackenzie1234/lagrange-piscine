/* Grass overlay colour, stationary grain regions, wear and bounded map memory. */
(async()=>{
 const assert=(ok,msg)=>{if(!ok)throw Error(msg)},report={};
 const pause=ms=>new Promise(r=>setTimeout(r,ms)),wait=async fn=>{for(let i=0;i<120;i++){if(fn())return;await pause(60)}throw Error('Region UI timed out')};
 const make=()=>{const c=document.createElement('canvas');c.width=512;c.height=384;return c},image=make(),g=image.getContext('2d'),noop=()=>{},hero={x:240,y:220};
 const pixels=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
 const changes=(a,b)=>a.reduce((n,v,i)=>n+(v!==b[i]),0);
 const field=new TerrainStudy.Field({mode:'grass',length:35,wind:0});
 report.foreground=[];
 for(const season of ['spring','winter']){
  field.configure({seasonFrom:season,seasonTo:season,seasonBlend:0,richness:1.6});field.weather.moisture.grass=.9;field.weather.frost=season==='winter'?.85:0;field.dirty=true;
  field.paint(g,hero,noop,noop,true);
  const raw=make(),r=raw.getContext('2d');r.save();r.beginPath();r.rect(Math.floor(hero.x)-17,Math.floor(hero.y)-42,34,47);r.clip();
  for(const cell of field.cells){if(cell.y<hero.y-3||cell.y>hero.y+45||Math.abs(cell.x-hero.x)>54)continue;const mask=QuestZones.foregroundRoots(cell,hero.y-1);if(!mask)continue;const sprite=field.sprite(cell,-.1,true,mask);r.drawImage(sprite,cell.x-sprite.width/2,cell.y-sprite.height+6)}r.restore();
  const original=pixels(raw),front=pixels(field.foregroundGrass),wetA=.9*.15,frostA=field.weather.frost*.28;let tested=0,altered=0,maxError=0;
  for(let i=0;i<front.length;i+=4)if(original[i+3]===255){tested++;for(let k=0;k<3;k++){const wet=original[i+k]*(1-wetA)+[37,74,56][k]*wetA,expected=wet*(1-frostA)+[227,235,237][k]*frostA;maxError=Math.max(maxError,Math.abs(front[i+k]-expected));altered+=front[i+k]!==original[i+k]}}
  assert(tested>100&&altered>100&&maxError<2.5,'Foreground skips wet/frost tint in '+season+' ('+maxError+')');
  report.foreground.push({season,testedPixels:tested,maxChannelError:maxError});
 }
 field.configure({mode:'earth',variation:1,edgeGrain:0,pathWear:0});const sizes=Array.from({length:3072},(_,i)=>field.variation.value('earth',i));
 const mean=sizes.reduce((a,b)=>a+b)/sizes.length;assert(Math.min(...sizes)<.7&&Math.max(...sizes)>1.3&&Math.abs(mean-1)<.02,'Natural patches lost their useful range/mean');
 const clone=new SurfaceVariation.Field();clone.configure(field.options,(x,y)=>field.materials(x,y));assert(sizes.every((v,i)=>v===clone.value('earth',i)),'Variation is not seeded/reproducible');
 field.configure({mode:'blend',variation:0,edgeGrain:1,pathWear:0});let centre=null,edge=null;
 for(let y=30;y<250;y+=4)for(let x=140;x<390;x+=4){const m=field.materials(x,y);if(m.earth>.999&&m.grass<.001)centre||={x,y};if(m.earth>.45&&m.earth<.55)edge||={x,y}}
 const interior=field.variation.sample('earth',centre.x,centre.y),boundary=field.variation.sample('earth',edge.x,edge.y);
 assert(boundary>interior*1.5,'Edges do not accumulate coarser grain');
 report.regions={min:Math.min(...sizes),max:Math.max(...sizes),mean,edgeScale:boundary,interiorScale:interior,seeded:true};
 field.configure({mode:'gravel',variation:0,edgeGrain:0,pathWear:1,wind:0,moisture:0});field.clearTracks();field.variation.clear();
 const outside={x:-40,y:-40},draw=()=>{field.paint(g,outside,noop,noop,true);return pixels(image)},before=draw(),sources=field.grainLayers.gravel.sources.map(s=>s.dry.toDataURL());
 const unworn=field.variation.sample('gravel',240,220);for(let i=0;i<9;i++)field.stampStep(hero,40,0);field.clearTracks();const after=draw(),worn=field.variation.sample('gravel',240,220);
 assert(worn<unworn*.7&&changes(before,after)>50,'Walking does not leave finer grain after footprints settle');
 assert(field.grainLayers.gravel.sources.every((s,i)=>s.dry.toDataURL()===sources[i]),'Wear rebuilds grain textures');
 const mask=field.grainLayers.gravel.bands.map(b=>b.mask.toDataURL());field.grainLayers.gravel.render({x:13,y:8},0);assert(mask.every((s,i)=>s===field.grainLayers.gravel.bands[i].mask.toDataURL()),'Grain regions move with the carrier texture');
 report.wear={before:unworn,after:worn,changedChannels:changes(before,after),sourcesReused:true,worldAnchored:true};
 const cache=new SurfaceMemory.Cache({maxEntries:3,maxBytes:12*1024});
 const rain={at:'2026-09-23T08:00:00Z',temp:16,hum:90,precip:3,wind:12,uv:1};field.applyWeatherRecord(rain);const saved=field.snapshotScene(hero);cache.remember('garden',saved);
 field.configure({layout:'coast'});field.restoreScene(null);field.weather.advance(4,{temperature:40,humidity:.1});
 const old=cache.recall('garden');assert(old.weather.elapsed===saved.weather.elapsed&&old.wear.every((v,i)=>v===saved.wear[i]),'Inactive scene advances or shares live wear');
 field.configure({layout:'garden'});const restored=field.restoreScene(old);assert(restored.x===hero.x&&restored.y===hero.y&&field.weather.elapsed===saved.weather.elapsed,'Scene does not restore');
 assert(!field.adaptWeatherOnEntry(rain)&&field.weather.elapsed===saved.weather.elapsed,'Same weather re-ages the map');
 const hot={...rain,at:'2026-09-23T10:00:00Z',temp:40,hum:15,precip:0,uv:8};assert(field.adaptWeatherOnEntry(hot)&&field.options.temperature===40&&field.weather.elapsed===saved.weather.elapsed+30,'New weather is not applied on re-entry');
 const applied=JSON.stringify(field.weather.snapshot());assert(!field.adaptWeatherOnEntry(rain)&&!field.adaptWeatherOnEntry(hot)&&JSON.stringify(field.weather.snapshot())===applied,'Old/repeated records change restored state');
 for(let i=0;i<50;i++)cache.remember('map-'+i,saved);assert(cache.stats.entries<=3&&cache.stats.bytes<=12*1024&&!cache.recall('garden'),'Scene LRU grows without bound');
 const grainBytes=field.stats.grainBytes;for(const layout of ['coast','stream','garden','stream','coast','garden']){field.configure({layout});field.restoreScene(null);assert(field.stats.grainBytes===grainBytes&&Object.values(field.grainLayers).every(l=>l.sources.length===4),'Rendered caches accumulate across maps')}
 report.memory={...cache.stats,grainBytes,snapshotBytes:saved.wear.byteLength,onlyNewWeatherApplied:true,inactiveStateFrozen:true,renderBuffersReused:true};
 field.dispose();assert(field.disposed&&field.bytes===0&&field.water.flow===null&&Object.values(field.grainLayers).every(l=>l.bytes===0),'Renderer resources survive disposal');report.disposal=true;
 const page=document.getElementById('terrain'),change=(id,value,event='change')=>{const e=document.getElementById(id);e.value=value;e.dispatchEvent(new Event(event,{bubbles:true}))};
 if(document.getElementById('walk').getAttribute('aria-pressed')==='true')document.getElementById('walk').click();
 change('variation',90,'input');change('edge-grain',80,'input');change('path-wear',100,'input');await wait(()=>+page.dataset.variation===.9&&+page.dataset.pathWear===1);
 const keys=['lagrange-piscine.v1','lagrange-piscine.weather'],originals=keys.map(k=>localStorage.getItem(k));
 try{
  const pack=weather=>JSON.stringify({readings:[{poolId:'TEST',weather}],visits:[],notes:[]});localStorage.setItem(keys[0],pack(rain));localStorage.removeItem(keys[1]);document.getElementById('logged-weather').click();
  await wait(()=>+page.dataset.temperature===16);change('map-layout','coast');await wait(()=>page.dataset.layout==='coast');
  localStorage.setItem(keys[0],pack(hot));const untouched=localStorage.getItem(keys[0]);change('map-layout','garden');await wait(()=>page.dataset.layout==='garden'&&+page.dataset.temperature===40);
  assert(localStorage.getItem(keys[0])===untouched&&localStorage.getItem(keys[1])===null,'Re-entry writes saved weather');assert(+page.dataset.sceneStates>=2&&+page.dataset.sceneStateBytes<65536,'Map selector does not use bounded states');
  report.controls={regions:true,mapMemory:true,newWeatherOnEntry:true,readOnlyWeather:true};
 }finally{keys.forEach((k,i)=>originals[i]==null?localStorage.removeItem(k):localStorage.setItem(k,originals[i]));document.getElementById('reset-weather').click()}
 return report;
})()
