/* Grain hierarchy, response ordering and the actual 2D fluid solver. */
(async()=>{
 const assert=(ok,msg)=>{if(!ok)throw Error(msg)},report={};
 const p=SurfaceDynamics.properties;
 assert(p.earth.grain<p.sand.grain&&p.sand.grain<p.gravel.grain,'Fine soil / sand / small gravel ordering');
 const mobile=['sand','earth','gravel'].map(t=>SurfaceDynamics.transport(t,0,.9));
 assert(mobile[0]>mobile[1]&&mobile[1]>mobile[2]&&mobile[2]===0,'Wind mobility ordering');
 const contact=['sand','earth','gravel'].map(t=>SurfaceDynamics.contact(t,0,.3).offset);
 assert(contact[0]>contact[1]&&contact[1]>contact[2]&&contact[2]>.5&&contact[2]<1,'Contact mobility ordering / visible gravel push');
 assert(SurfaceDynamics.transport('sand',.8,.9)<mobile[0]*.05,'Wet cohesion does not restrain grains');
 report.materialScale={grains:[p.sand.grain,p.earth.grain,p.gravel.grain],windMobility:mobile,contactDisplacement:contact};
 const rooted={x:80,y:80,length:35,windBend:0,windVelocity:0};SurfaceDynamics.windSpring(rooted,{x:1,y:0},1/30);const first=rooted.windBend;
 for(let i=0;i<60;i++)SurfaceDynamics.windSpring(rooted,{x:1,y:0},1/30);
 assert(first>0&&rooted.windBend>first&&rooted.x===80&&rooted.y===80,'Grass is not rooted with lag');report.rootedSpring=true;
 const fluid=new SurfaceFluid.Flow(),mask=new Uint8Array(512*384).fill(255);fluid.setMask(mask);fluid.impulse(252,188,48,18,1);
 const before=fluid.divergence();fluid.project();const after=fluid.divergence();assert(after<before*.65,'Pressure projection does not remove divergence');
 const dye=fluid.dye.slice();for(let i=0;i<150;i++)fluid.advance(1/30,{wind:.85,angle:.4,rain:.3});
 assert([...fluid.u,...fluid.v,...fluid.dye].every(Number.isFinite),'Fluid blew up');assert(fluid.stats.maxSpeed<12,'Unbounded fluid velocity');
 const advected=fluid.dye.reduce((n,v,i)=>n+(Math.abs(v-dye[i])>.005),0);assert(advected>100,'Scalar texture is not advected');
 report.fluid={grid:[64,48],divergenceBefore:before,divergenceAfter:after,advectedCells:advected,...fluid.stats};
 for(let y=0;y<384;y++)for(let x=256;x<512;x++)mask[y*512+x]=0;fluid.setMask(mask);for(let i=0;i<20;i++)fluid.advance(1/30,{wind:1});
 assert(fluid.u.every((v,i)=>fluid.mask[i]||v===0)&&fluid.v.every((v,i)=>fluid.mask[i]||v===0),'Flow leaks onto solid ground');report.fluid.maskedBoundary=true;
 const field=new TerrainStudy.Field({mode:'sand',moisture:0,wind:.9});for(let i=0;i<30;i++)field.advance(1/30,{x:30,y:30});
 assert(Math.hypot(field.sandOffset.x,field.sandOffset.y)>.1,'Sand texture does not drift');
 const at={...field.sandOffset};field.configure({moisture:1});field.weather.moisture.sand=1;for(let i=0;i<10;i++)field.advance(1/30,{x:30,y:30});
 assert(Math.hypot(field.sandOffset.x-at.x,field.sandOffset.y-at.y)<.01,'Wet sand is not restrained');report.sandAdvection=true;
 const wet=new TerrainStudy.Field({rain:.9,sun:.08,speed:4});wet.seekSequence(4.2);
 const state=JSON.stringify([wet.water.flow.u,wet.water.flow.v,wet.water.flow.dye,wet.weather.snapshot(),wet.cells.map(c=>c.windBend)]);
 wet.seekSequence(4.2);assert(state===JSON.stringify([wet.water.flow.u,wet.water.flow.v,wet.water.flow.dye,wet.weather.snapshot(),wet.cells.map(c=>c.windBend)]),'Fluid replay is not deterministic');report.deterministicReplay=true;
 const scale=document.getElementById('grain');scale.value=2;scale.dispatchEvent(new Event('input',{bubbles:true}));assert(document.getElementById('grain-relation').textContent.includes('Gravel 1.5 px'),'Scale does not keep ratios');scale.value=1;scale.dispatchEvent(new Event('input',{bubbles:true}));
 const vectors=document.getElementById('flow-vectors');vectors.checked=true;vectors.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,350));assert(document.querySelector('canvas').dataset.vectors==='true','Flow inspector');vectors.checked=false;vectors.dispatchEvent(new Event('change',{bubbles:true}));
 report.controls=true;report.noGameStores=typeof Store==='undefined'&&typeof Sync==='undefined'&&typeof Game==='undefined';return report;
})()
