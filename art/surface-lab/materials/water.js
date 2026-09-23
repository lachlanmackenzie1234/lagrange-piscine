/* Shallow water, low-ground puddles, wading ripples and rain rings. */
const SurfaceWater=(()=>{
 const W=512,H=384,clamp=v=>Math.max(0,Math.min(1,v));
 const hash=(x,y,s)=>{let n=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^Math.imul(s,1274126177);n=Math.imul(n^n>>>13,1274126177);return((n^n>>>16)>>>0)/4294967296};
 function canvas(){const c=document.createElement('canvas');c.width=W;c.height=H;return c}
 function ring(g,x,y,rx,ry,colour){g.fillStyle=colour;for(let yy=-Math.ceil(ry);yy<=ry;yy++){const dx=Math.sqrt(Math.max(0,1-(yy/Math.max(.1,ry))**2))*rx;g.fillRect(Math.round(x-dx),Math.round(y+yy),1,1);g.fillRect(Math.round(x+dx),Math.round(y+yy),1,1)}}
 class Layer{
  constructor(){this.layer=canvas();this.overlay=canvas();this.mask=canvas();this.image=this.layer.getContext('2d').createImageData(W,H);this.flow=new SurfaceFluid.Flow();this.ripples=[];this.alpha=new Uint8Array(W*H);this.depth=new Float32Array(W*H);this.puddle=new Uint8Array(W*H);this.active=[];this.count=0;this.ice=0}
  setup(alpha,depth,materials){this.permanent=new Uint8Array(alpha);this.permanentDepth=new Float32Array(depth);this.spots=[];
   for(let y=0;y<5;y++)for(let x=0;x<6;x++){const xx=40+x*83+(hash(x,y,177)-.5)*34,yy=42+y*68+(hash(x,y,193)-.5)*25,m=materials(xx,yy);if(m.water>.2||m.solid)continue;
    this.spots.push({x:xx,y:yy,rx:10+hash(x,y,211)*13,ry:5+hash(x,y,223)*7,threshold:.035+hash(x,y,229)*.22,retain:m.earth+m.gravel*.74+m.grass*.44+m.sand*.27});
   }this.levelKey=null;this.tick=null;this.clear();this.update(0)}
  clear(){this.ripples.length=0;this.flow.clear();this.tick=null}
  dispose(){for(const c of [this.layer,this.overlay,this.mask])c.width=c.height=1;this.ripples.length=this.active.length=0;this.image=this.flow=this.alpha=this.depth=this.puddle=this.permanent=this.permanentDepth=null;this.spots=[]}
  update(level,loss=0){const key=Math.round(level*40)+'/'+Math.round(loss*64);if(key===this.levelKey)return;this.levelKey=key;this.alpha.set(this.permanent);this.depth.set(this.permanentDepth);this.puddle.fill(0);this.count=0;
   if(loss>0)for(let i=0;i<this.alpha.length;i++)if(this.alpha[i]){this.depth[i]=Math.max(0,this.depth[i]-loss);this.alpha[i]*=clamp(this.depth[i]/.09)}
   for(const p of this.spots){const fill=clamp((level*p.retain-p.threshold)/.5);if(fill<.025)continue;this.count++;
    const scale=Math.sqrt(fill),rx=p.rx*scale,ry=p.ry*scale;
    for(let y=Math.max(0,Math.floor(p.y-ry-1));y<=Math.min(H-1,Math.ceil(p.y+ry+1));y++)for(let x=Math.max(0,Math.floor(p.x-rx-1));x<=Math.min(W-1,Math.ceil(p.x+rx+1));x++){
     const d=Math.hypot((x-p.x)/Math.max(1,rx),(y-p.y)/Math.max(1,ry))+(Math.sin(x*.37+p.rx)+Math.cos(y*.51+p.ry))*.045,a=Math.round(clamp((1-d)*6)*220);if(!a)continue;const i=y*W+x;
     if(a>this.alpha[i]){this.alpha[i]=a;this.depth[i]=.08+fill*.13+Math.max(0,1-d)*.08;this.puddle[i]=a}
    }
   }
   const data=this.mask.getContext('2d').createImageData(W,H);this.active=[];this.image.data.fill(0);
   for(let i=0;i<this.alpha.length;i++)if(this.alpha[i]){data.data[i*4+3]=this.alpha[i];this.active.push(i)}
   this.mask.getContext('2d').putImageData(data,0,0);this.flow.setMask(this.alpha,W);this.tick=null;
  }
  at(x,y){const i=Math.max(0,Math.min(H-1,Math.floor(y)))*W+Math.max(0,Math.min(W-1,Math.floor(x)));return this.alpha[i]/255}
  iceAt(x,y){const i=Math.max(0,Math.min(H-1,Math.floor(y)))*W+Math.max(0,Math.min(W-1,Math.floor(x)));return this.alpha[i]?this.iceAmount(i):0}
  iceAmount(i){return clamp((this.ice*1.5-.25-this.depth[i]*.3+(hash((i%W)>>3,(i/W)>>3,353)-.5)*.12)*3)}
  liquidAt(x,y){return this.at(x,y)*(1-this.iceAt(x,y))}
  isPuddle(x,y){const i=Math.max(0,Math.min(H-1,Math.floor(y)))*W+Math.max(0,Math.min(W-1,Math.floor(x)));return this.puddle[i]>0}
  step(x,y,time,strength=1,vx=14,vy=9){strength*=1-this.iceAt(x,y);if(strength<.03)return;this.ripples.push({x,y,at:time,strength});this.flow.impulse(x,y,vx,vy,strength*.55);if(this.ripples.length>64)this.ripples.shift()}
  advance(dt,options,quiet=false){
   if(this.ice>.95){this.flow.u.fill(0);this.flow.v.fill(0);this.ripples.length=0;return}
   if(!quiet)this.flow.advance(dt,{...options,wind:options.wind*(1-this.ice),rain:options.rain*(1-this.ice),drag:SurfaceDynamics.properties.water.drag+this.ice*8,viscosity:SurfaceDynamics.properties.water.viscosity+this.ice*1.8});
  }
  paint(g,time,{wind=.35,angle=0,rain=0,season=SurfaceColour.seasons.summer,richness=1.25,sharedReflections=false}={},quiet=false){if(!this.active.length)return;
   const frame=quiet?0:Math.floor(time*12),t=frame/12,tick=frame+'/'+Math.round(this.ice*64)+'/'+season.water.join(',')+'/'+richness;
   if(tick!==this.tick){const data=this.image.data,xWave=new Float32Array(W),yWave=new Float32Array(H),tint=season.water.map((v,i)=>v-SurfaceColour.seasons.summer.water[i]);
    for(let x=0;x<W;x++)xWave[x]=Math.sin(x*.055-t*(.4+wind*1.6))*2.2+Math.sin(x*.137+t*.7)*.55;
    for(let y=0;y<H;y++)yWave[y]=Math.sin(y*.09+t*(.4+wind))*1.3;
    for(const i of this.active){const x=i%W,y=(i/W)|0,d=this.depth[i],carried=this.flow.sample(this.flow.dye,x/8-.5,y/8-.5)-.5,wave=xWave[x]+yWave[y]+carried*9,p=!!this.puddle[i],j=i*4,ice=this.iceAmount(i);
     const crystal=(hash(x>>2,y>>2,359)-.5)*10+Math.sin(x*.13+y*.08)*3;
     const r=(p?121-30*d:121-66*d)+wave*.6+tint[0],green=(p?157-22*d:202-67*d)+wave+tint[1],b=(p?148-10*d:192-32*d)+wave*1.1+tint[2],luma=r*.2126+green*.7152+b*.0722;
     data[j]=(luma+(r-luma)*richness)*(1-ice)+(193+crystal)*ice;
     data[j+1]=(luma+(green-luma)*richness)*(1-ice)+(217+crystal)*ice;
     data[j+2]=(luma+(b-luma)*richness)*(1-ice)+(221+crystal)*ice;
     data[j+3]=this.alpha[i];
    }this.layer.getContext('2d').putImageData(this.image,0,0);this.tick=tick;
   }
   g.drawImage(this.layer,0,0);const fx=this.overlay.getContext('2d');fx.clearRect(0,0,W,H);fx.imageSmoothingEnabled=false;
   const count=Math.min(75,Math.max(8,Math.floor(this.active.length/400)));
   for(let n=0;n<(sharedReflections?0:count);n++){const i=this.active[Math.floor(hash(n,1,271)*(this.active.length-1))],x=i%W,y=(i/W)|0,phase=quiet?0:t*.75+n;
    fx.globalAlpha=(.08+(Math.sin(phase)*.5+.5)*.16)*(1-this.iceAt(x,y));fx.fillStyle='#d7f0df';const velocity=this.flow.at(x,y),offset=quiet?0:Math.sin(t+n)*wind*2;
    fx.fillRect(Math.round(x+offset*Math.cos(angle)+velocity.x*3),Math.round(y+offset*Math.sin(angle)+velocity.y*3),3+n%5,1);
   }
   this.ripples=this.ripples.filter(p=>time-p.at<1.5);
   if(!quiet){for(const p of this.ripples){const age=time-p.at,r=2+age*13;fx.globalAlpha=(1-age/1.5)*.48*p.strength*(1-this.iceAt(p.x,p.y));ring(fx,p.x,p.y,r,r*.48,'#e8f1d5');if(r>6){fx.globalAlpha*=.4;ring(fx,p.x,p.y,r-4,(r-4)*.48,'#45898c')}}
    for(let n=0;n<Math.round(rain*55);n++){const age=(time*1.4+hash(n,1,293))%1,i=this.active[Math.floor(hash(n,Math.floor(time*1.4+hash(n,1,293)),307)*(this.active.length-1))];fx.globalAlpha=(1-age)*.3*(1-this.iceAmount(i));ring(fx,i%W,(i/W)|0,1+age*6,1+age*2.3,'#e3eee0')}
   }
   fx.globalAlpha=1;fx.globalCompositeOperation='destination-in';fx.drawImage(this.mask,0,0);fx.globalCompositeOperation='source-over';g.drawImage(this.overlay,0,0);
  }
  foreground(g,hero){const amount=this.liquidAt(hero.x,hero.y);if(amount<.1)return;
   g.save();g.beginPath();g.rect(hero.x-8,hero.y-4,16,7);g.clip();g.drawImage(this.layer,0,0);g.restore();
   g.save();g.globalAlpha=amount*.3;ring(g,hero.x,hero.y-1,8,2,'#dbeade');g.restore();
  }
  vectors(g){g.save();g.strokeStyle='#f1edd0';g.lineWidth=1;g.globalAlpha=.65;for(const i of this.flow.cells){const x=i%this.flow.width,y=i/this.flow.width|0;if(x%3||y%3)continue;g.beginPath();g.moveTo(x*8+4,y*8+4);g.lineTo(x*8+4+this.flow.u[i]*18,y*8+4+this.flow.v[i]*18);g.stroke()}g.restore()}
 }
 return{Layer};
})();
if(typeof window!=='undefined')window.SurfaceWater=SurfaceWater;
