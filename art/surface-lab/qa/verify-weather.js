/* Run in the open lab: agent-browser eval --stdin < this file. */
(async()=>{
 const assert=(ok,msg)=>{if(!ok)throw Error(msg)},pause=ms=>new Promise(r=>setTimeout(r,ms));
 const wait=async(fn,ms=12000)=>{for(let n=0;n<ms/50;n++){if(fn())return;await pause(50)}throw Error('Weather lab timed out')};
 const storage=JSON.stringify(Object.fromEntries(Object.entries(localStorage))),report={maps:{}};
 for(const layout of Object.keys(SurfaceMaps.layouts)){
  const sum=Object.fromEntries(SurfaceMaps.types.map(t=>[t,0]));let count=0;
  for(let y=4;y<384;y+=8)for(let x=4;x<512;x+=8){const m=SurfaceMaps.sample(x,y,24,'blend',layout);assert(Object.values(m).every(v=>v>=0&&v<=1),'Invalid blend weight');assert(Math.abs(Object.values(m).reduce((a,b)=>a+b)-1)<1e-8,'Blend does not conserve material');for(const t of SurfaceMaps.types)sum[t]+=m[t];count++}
  for(const t of SurfaceMaps.types)assert(sum[t]/count>.01,'A material is missing from '+layout);
  report.maps[layout]=Object.fromEntries(Object.entries(sum).map(([t,n])=>[t,+(n/count*100).toFixed(1)]));
 }
 const dry=new TerrainStudy.Field({mode:'gravel',moisture:0}),h={x:245,y:275};
 dry.advance(.05,h);h.x+=12;dry.advance(.05,h);assert(dry.tracks.some(p=>p.gravel===1),'Gravel has no contact');assert(!dry.cells.length&&!dry.hasSand,'Gravel isolation');
 for(let n=0;n<90;n++)dry.advance(.1,h);assert(!dry.tracks.length,'Gravel does not settle');report.gravelContact=true;
 const water=new TerrainStudy.Field({mode:'water'}),wh={x:245,y:240};water.advance(.05,wh);wh.x+=12;water.advance(.05,wh);
 assert(water.water.at(wh.x,wh.y)===1&&water.water.ripples.length>0&&!water.tracks.length&&!water.dust.length,'Wading effects');
 const c=document.createElement('canvas');c.width=512;c.height=384;const g=c.getContext('2d');
 water.water.clear();water.time=0;water.paint(g,wh,()=>{},()=>{},false);const a=g.getImageData(0,0,512,384).data;
 water.time=2;water.paint(g,wh,()=>{},()=>{},false);const b=g.getImageData(0,0,512,384).data;let changed=0;for(let i=0;i<a.length;i+=4)if(a[i]!==b[i]||a[i+1]!==b[i+1])changed++;
 assert(changed>10000,'Water does not animate');water.paint(g,wh,()=>{},()=>{},true);const qa=g.getImageData(0,0,512,384).data;water.time=8;water.paint(g,wh,()=>{},()=>{},true);const qb=g.getImageData(0,0,512,384).data;assert(!qa.some((v,i)=>v!==qb[i]),'Reduced-motion water moves');
 report.water={wadingRipples:true,animatedPixels:changed,reducedMotionStatic:true};
 const soil=new TerrainStudy.Field({mode:'earth',moisture:.05,rain:.9,wind:.45,sun:.08}),sh={x:30,y:35};
 const beforeDust=soil.weather.dust('earth');for(let n=0;n<250;n++)soil.advance(.1,sh);
 const wet=soil.weather.snapshot(),puddles=soil.water.count;assert(wet.moisture.earth>.85&&puddles>3&&soil.weather.dust('earth')<beforeDust*.1,'Rain did not soak/fill/suppress dust');
 const spot=soil.water.spots.find(p=>soil.water.at(p.x,p.y)>.5);assert(spot,'No walkable puddle');soil.water.step(spot.x,spot.y,soil.time);assert(soil.water.ripples.length>0,'Puddle ripple');
 soil.configure({rain:0,wind:.45,sun:1});for(let n=0;n<500;n++)soil.advance(.1,sh);
 assert(soil.water.count===0&&soil.wetness('earth')<.2&&soil.weather.dust('earth')>.5,'Drying did not drain/release dust');
 report.weather={wetEarth:wet.moisture.earth,puddlesAt25Seconds:puddles,dryEarth:soil.wetness('earth'),puddlesAfterDrying:soil.water.count,dustReturns:true};
 const garden=new TerrainStudy.Field({rain:.9,sun:.08,moisture:.1});for(let n=0;n<200;n++)garden.advance(.1,sh);
 const permanent=garden.water.permanent.reduce((n,a)=>n+(a>0),0);garden.resetWeather();assert(garden.water.count===0&&garden.water.active.length===permanent,'Reset drained permanent water');
 garden.seekSequence(4.2);const snapshot=JSON.stringify([garden.weather.snapshot(),garden.tracks,garden.water.alpha]);garden.seekSequence(4.2);assert(snapshot===JSON.stringify([garden.weather.snapshot(),garden.tracks,garden.water.alpha]),'Weather scrubbing not deterministic');report.resetAndScrub=true;
 const page=document.querySelector('#terrain'),change=(id,value,event='change')=>{const node=document.getElementById(id);node.value=value;node.dispatchEvent(new Event(event,{bubbles:true}))};
 document.getElementById('reset-weather').click();change('weather-speed','1');
 document.querySelector('[data-mode="blend"]').click();await wait(()=>page.dataset.mode==='blend');
 for(const layout of Object.keys(SurfaceMaps.layouts)){change('map-layout',layout);await wait(()=>page.dataset.layout===layout);assert(+page.dataset.growthMean>19.7&&+page.dataset.growthMean<20.3,'Map growth changed')}
 for(const mode of ['gravel','water','blend']){document.querySelector('[data-mode="'+mode+'"]').click();await wait(()=>page.dataset.mode===mode)}
 change('map-layout','garden');change('weather-speed','8');change('weather-preset','rain');await wait(()=>+page.dataset.puddles>=3&&+page.dataset.wetness>.65);
 const rainCount=+page.dataset.puddles;change('weather-preset','drying');await wait(()=>+page.dataset.puddles===0&&+page.dataset.wetness<.3,20000);
 report.controls={maps:3,modes:true,rainPuddles:rainCount,drying:true};
 document.getElementById('reset-weather').click();change('weather-speed','1');
 report.noGameStores=typeof Store==='undefined'&&typeof Sync==='undefined'&&typeof Game==='undefined';report.storageUnchanged=storage===JSON.stringify(Object.fromEntries(Object.entries(localStorage)));
 report.cache={bytes:+page.dataset.cacheBytes,frames:+page.dataset.frames};assert(report.cache.bytes<=4*1048576&&report.cache.frames<=768,'Grass cache exceeded');
 return report;
})()
