/* Sparse achromatic surface highlights. Artistic roughness/lobe model, not PBR. */
const SurfaceReflections = (() => {
  const W=512,H=384,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const hash=(x,y,s=0)=>{let n=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^Math.imul(s,1274126177);n=Math.imul(n^n>>>13,1274126177);return((n^n>>>16)>>>0)/4294967296};
  const names=['water','grass','sand','earth','gravel','keeper'];
  const defaults={reflectionStrength:.65,reflectionWet:1,reflectionRoughness:.5,reflectWater:.78,reflectGrass:.2,reflectSand:.09,reflectEarth:.08,reflectGravel:.25,reflectKeeper:.14,reflectionView:false};
  const roughness={water:.2,grass:.62,sand:.86,earth:.92,gravel:.66,keeper:.55};
  const option=type=>'reflect'+type[0].toUpperCase()+type.slice(1);
  function response(type,wet,options){const base=clamp(options[option(type)]??defaults[option(type)]),water=clamp(wet);
    // Water is already a liquid. A wet film lifts land reflectance without
    // flattening the upper part of its material slider into a clipped plateau.
    return{reflectance:type==='water'?base:base**(1/(1+water*options.reflectionWet*2)),roughness:clamp(roughness[type]+(options.reflectionRoughness-.5)*.65-(type==='water'?0:water*options.reflectionWet*.48),.08,.98)};
  }
  function energy(type,wet,orientation,illumination,options){const r=response(type,wet,options),facing=(.5+.5*Math.cos(orientation+.7))**(1+(1-r.roughness)*10);
    return clamp(options.reflectionStrength*r.reflectance*illumination*(1-r.roughness*.6)*(.15+facing*.85));
  }
  function canvas(){const c=document.createElement('canvas');c.width=W;c.height=H;return c}
  // Same anchored blade curve as QuestZones: highlights stay on moving leaves.
  function grassPoint(cell,shape,index,t=.82){const [rx,ry]=QuestZones.BLADE_ROOTS[index],variant=shape.variant,h=shape.height,pose=shape.pose;
    if(!(shape.mask&(1<<index))||(index+variant)%6>=shape.amount)return null;
    const tall=Math.max(1,Math.round(h*(.62+((index*3+variant)%5)*.095)));let dx,rise;
    if(h>15){const flex=clamp((h-15)/25),side=(index+variant)%2?1:-1,bend=pose*(1+flex*1.15)+side*flex*(5+((index*3+variant)%5)*1.3)+((index+variant)%3-1),sag=flex*(.1+Math.min(.1,Math.abs(bend)*.005));
      t=Math.round(t*tall*3)/(tall*3);const u=1-t;dx=3*u*t*t*bend*.38+t*t*t*bend;rise=3*u*u*t*tall*.45+3*u*t*t*tall*(1+flex*.1)+t*t*t*tall*(1-sag);
    }else{rise=Math.min(tall-1,Math.round(tall*t));dx=Math.round((pose+((index+variant)%3-1))*(rise/tall)**1.3)}
    return{x:Math.round(cell.x+rx+dx),y:Math.round(cell.y+ry-rise)};
  }
  class Layer{
    constructor(){this.ground=canvas();this.grass=canvas();this.mask=canvas();this.sites=[];this.counts=Object.fromEntries(names.map(n=>[n,0]));this.tick=null}
    setup(materialAt){this.sites.length=0;for(let y=4;y<H;y+=8)for(let x=4;x<W;x+=8){const xx=x+(hash(x,y,701)-.5)*4,yy=y+(hash(x,y,709)-.5)*4;this.sites.push({x:xx,y:yy,seed:hash(x,y,719),angle:hash(x,y,727)*Math.PI*2,material:materialAt(xx,yy)})}this.tick=null}
    update(field,hero,quiet=false){
      const o=field.options,daylight=field.adaptive?1+(field.adaptive.illumination-1)*o.adaptation:1,frame=quiet?0:Math.floor(field.time*12),key=JSON.stringify([frame,Math.round(hero.x),Math.round(hero.y),names.map(n=>o[option(n)]),o.reflectionStrength,o.reflectionWet,o.reflectionRoughness,o.sun,o.rain,o.lightStrength,Math.round(daylight*128),field.light.key,Math.round(field.weather.frost*64),Math.round(field.weather.ice*64),...Object.values(field.weather.moisture).map(v=>Math.round(v*64)),field.variation.revision,field.grassTick]);
      if(key===this.tick)return;this.tick=key;this.counts=Object.fromEntries(names.map(n=>[n,0]));
      const ground=this.ground.getContext('2d'),grass=this.grass.getContext('2d'),mask=this.mask.getContext('2d');for(const g of [ground,grass,mask]){g.clearRect(0,0,W,H);g.fillStyle='#fff';g.globalAlpha=1;g.globalCompositeOperation='source-over';g.imageSmoothingEnabled=false}
      if(o.reflectionStrength<=0)return;
      const light=field.light.key,luma=(light[0]*.2126+light[1]*.7152+light[2]*.0722)/255,brightness=1+(luma-1)*o.lightStrength;
      const illumination=clamp((.18+o.sun*.6+o.lightStrength*.22)*brightness*daylight);
      const recent=field.tracks.filter(p=>p.gravel>.1&&field.time-p.at<.4).slice(-4),time=quiet?0:frame/12;
      for(const site of this.sites){
        if(site.material.sand+site.material.earth+site.material.gravel<.05&&site.material.water<.05&&field.water.at(site.x,site.y)<=.2)continue;
        let type=['sand','earth','gravel'].reduce((a,t)=>site.material[t]>site.material[a]?t:a,'sand'),x=site.x,y=site.y;
        const offset=type==='sand'?field.sandOffset:type==='earth'?field.earthOffset:null;
        if(offset&&!quiet&&field.water.at(site.x,site.y)<=.2){x=(x+offset.x+W)%W;y=(y+offset.y+H)%H}
        const water=field.water.at(x,y),ice=field.water.iceAt(x,y),m=offset?field.materials(x,y):site.material;
        let amount=m[type]*(1-water),wet=field.wetness(type),motion=0;
        if(water>.2){type='water';amount=water;wet=1;motion=ice>.7?0:Math.sin(time*.9+site.angle*3)*.9+field.water.flow.at(x,y).x*.4}
        else if(site.material.water>.6){type='sand';amount=1-water;wet=field.wetness('sand')}
        if(amount<.1)continue;
        if(type==='gravel'&&!quiet)for(const p of recent)if(Math.abs(p.x-x)<10&&Math.abs(p.y-y)<8)motion+=Math.sin((field.time-p.at)*15)*.8;
        const e=energy(type,wet,site.angle+motion,illumination,o)*amount;
        if(site.seed>=e*.8)continue;
        const width=type==='water'?2+Math.round((1-response(type,wet,o).roughness)*3):type==='earth'&&wet>.65?2:type==='gravel'?1+Number(wet>.6&&e>.12):1;
        ground.fillRect(Math.round(x),Math.round(y),width,1);this.counts[type]++;
      }
      // Ground sheen is occluded by the actual grass silhouette and the keeper.
      ground.globalCompositeOperation='destination-out';ground.drawImage(field.grassLayer,0,0);ground.globalCompositeOperation='source-over';ground.clearRect(Math.floor(hero.x)-11,Math.floor(hero.y)-35,22,37);
      let candidates=0;
      for(const cell of field.cells){const seed=hash(cell.x,cell.y,743);if(seed>.33||candidates++>=1024)continue;
        const shape=field.shape(cell,(quiet?-1:Math.floor(field.time*10))/10,quiet),index=Math.floor(hash(cell.x,cell.y,751)*6),point=grassPoint(cell,shape,index);
        if(!point)continue;
        const e=energy('grass',field.wetness('grass'),hash(cell.x,cell.y,757)*Math.PI*2+shape.pose*.16,illumination,o);
        if(hash(cell.x,cell.y,761)>=e*1.8)continue;
        const length=field.wetness('grass')>.6?3:1;
        for(let j=0;j<length;j++){const tip=grassPoint(cell,shape,index,.78+j*.045);if(!tip)continue;
          if(Math.abs(tip.x-hero.x)<11&&tip.y>hero.y-35&&tip.y<hero.y+2&&!(QuestZones.foregroundRoots(cell,hero.y-1)&(1<<index)))continue;
          grass.fillRect(tip.x,tip.y,1,1);
        }this.counts.grass++;
      }
      grass.globalCompositeOperation='destination-in';grass.drawImage(field.grassLayer,0,0);grass.globalCompositeOperation='source-over';
      mask.drawImage(this.ground,0,0);mask.drawImage(this.grass,0,0);
      // Reuse scratch for the keeper; foreground leaves occlude its highlights.
      ground.clearRect(0,0,W,H);ground.fillStyle='#fff';
      const keeper=energy('keeper',clamp(o.rain*.8+field.water.liquidAt(hero.x,hero.y)*.2),-.7,illumination,o);
      if(keeper>.02){ground.fillRect(Math.round(hero.x)-4,Math.round(hero.y)-24,1,1);this.counts.keeper++}
      if(keeper>.085){ground.fillRect(Math.round(hero.x)+3,Math.round(hero.y)-12,1,1);this.counts.keeper++}
      ground.globalCompositeOperation='destination-out';ground.drawImage(field.foregroundGrass,0,0);ground.globalCompositeOperation='source-over';mask.drawImage(this.ground,0,0);
    }
    paint(g,field,hero,quiet=false,only=false){this.update(field,hero,quiet);g.save();g.imageSmoothingEnabled=false;if(only){g.fillStyle='#000';g.fillRect(0,0,W,H)}g.drawImage(this.mask,0,0);g.restore()}
    get stats(){return{sites:this.sites.length,counts:{...this.counts},bytes:this.disposed?0:3*W*H*4}}
    dispose(){for(const c of [this.ground,this.grass,this.mask])c.width=c.height=1;this.sites.length=0;this.disposed=true}
  }
  return{Layer,defaults,names,response,energy,grassPoint};
})();
if(typeof window!=='undefined')window.SurfaceReflections=SurfaceReflections;
if(typeof module!=='undefined')module.exports=SurfaceReflections;
