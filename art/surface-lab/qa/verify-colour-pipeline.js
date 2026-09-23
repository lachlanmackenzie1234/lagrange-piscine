/* Independent pigment, opposing-colour lighting, and final scene grade. */
(async () => {
  const assert=(ok,message)=>{if(!ok)throw Error(message)},report={};
  const pause=ms=>new Promise(r=>setTimeout(r,ms)),wait=async fn=>{for(let i=0;i<100;i++){if(fn())return;await pause(100)}throw Error('Colour controls timed out')};
  const c=document.createElement('canvas');c.width=512;c.height=384;const g=c.getContext('2d'),hero={x:245,y:278},noop=()=>{};
  const field=new TerrainStudy.Field({wind:0,richness:1.4,lightStrength:0});
  const render=()=>{field.paint(g,hero,noop,noop,true);return g.getImageData(0,0,512,384).data};
  const changed=(a,b)=>a.reduce((n,v,i)=>n+(v!==b[i]),0);
  const physics=()=>JSON.stringify([field.options.mode,field.options.layout,field.weather.snapshot(),field.tracks,field.cells.map(v=>[v.x,v.y,v.length,v.bend]),field.water.flow.dye]);
  const stable=physics(),base=field.base.toDataURL(),earth=field.earthSource.toDataURL(),unlit=render();
  field.configure({lightPalette:'amber',lightSaturation:1.5});
  assert(changed(unlit,render())===0,'Lighting colour leaks through zero light blend');
  field.configure({lightStrength:1});const lit=render(),delta=changed(unlit,lit);
  assert(delta>200000,'Opposing light palette has no visible effect');
  assert(field.base.toDataURL()===base&&field.earthSource.toDataURL()===earth,'Lighting rewrites pigment textures');
  assert(physics()===stable,'Lighting changes terrain or weather');
  field.configure({lightPalette:'custom',keyLight:'#aaffee',shadowColour:'#8c355c',lightSaturation:1});
  assert(field.light.key.join(',')==='170,255,238'&&field.light.shadow.join(',')==='140,53,92','Custom palette');
  field.configure({lightSaturation:0});
  assert(field.light.key.every(v=>v===field.light.key[0])&&field.light.shadow.every(v=>v===field.light.shadow[0]),'Lighting cannot be desaturated independently');
  assert(field.base.toDataURL()===base,'Desaturating illumination removes pigment');
  assert(field.keyLayer.width===128&&field.shadeLayer.height===96,'Lighting cache grew');
  report.lighting={changedChannels:delta,independentOfPigment:true,physicsUnchanged:true,customPair:true,independentDesaturation:true,cacheBytes:2*128*96*4};
  field.configure({richness:.6});const muted=field.base.toDataURL();field.configure({richness:1.8});
  assert(field.base.toDataURL()!==muted&&physics()===stable,'Pigment richness missing or changes simulation');report.pigment={richness:true,physicsUnchanged:true};

  const page=document.getElementById('terrain'),storage=JSON.stringify({...localStorage});
  const change=(id,value,event='input')=>{const e=document.getElementById(id);e.value=value;e.dispatchEvent(new Event(event,{bubbles:true}))};
  change('lighting','rose','change');await wait(()=>page.dataset.lightPalette==='rose');
  assert(document.getElementById('key-light').value==='#ffc3b7'&&document.getElementById('shadow-colour').value==='#326b70','Preset does not update swatches');
  change('key-light','#c9f5ff');await wait(()=>page.dataset.lightPalette==='custom');
  change('light-strength',85);change('light-saturation',0);await wait(()=>+page.dataset.lightStrength===.85&&+page.dataset.lightSaturation===0);
  change('richness',150);await wait(()=>+page.dataset.richness===1.5);
  change('saturation',0);change('exposure',115);change('contrast',130);
  assert(page.style.filter.includes('saturate(0)')&&page.style.filter.includes('brightness(1.15)')&&page.style.filter.includes('contrast(1.3)'),'Final grade controls');
  change('view','grey','change');assert(page.style.filter.includes('grayscale(1)'),'Grey finish');
  change('view','ink','change');assert(page.style.filter.includes('url('),'Black/white finish');
  change('view','colour','change');change('saturation',100);change('exposure',100);change('contrast',100);change('lighting','sun','change');change('light-strength',55);change('light-saturation',100);change('richness',125);
  await wait(()=>+page.dataset.richness===1.25);
  assert(storage===JSON.stringify({...localStorage}),'Colour controls write saved data');
  report.controls={presetSwatches:true,customPair:true,pigmentLightingAndFinalSaturation:true,greyscaleAndInk:true,storageUnchanged:true};
  return report;
})()
