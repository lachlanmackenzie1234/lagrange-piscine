/* Small masked 2D incompressible velocity solver. Cell-space units.
 * Forces -> implicit viscosity -> pressure projection -> backtraced advection
 * -> projection. See README for the Stable Fluids paper and scope. */
const SurfaceFluid=(()=>{
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 class Flow{
  constructor(width=64,height=48,cellSize=8){this.width=width;this.height=height;this.cellSize=cellSize;const n=width*height;
   for(const key of ['u','v','u0','v0','p','div','driftX','driftY','dye','dye0'])this[key]=new Float32Array(n);this.mask=new Uint8Array(n);this.cells=[];this.time=0;this.lastProjection={before:0,after:0};
  }
  setMask(alpha,pixelWidth=512){const w=this.width,h=this.height,s=this.cellSize;this.cells=[];
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x,was=this.mask[i],visible=x>0&&y>0&&x<w-1&&y<h-1&&alpha[(y*s+s/2|0)*pixelWidth+(x*s+s/2|0)]>35;this.mask[i]=visible?1:0;
    if(visible){this.cells.push(i);if(!was)this.dye[i]=this.pattern(x,y)}else this.u[i]=this.v[i]=this.driftX[i]=this.driftY[i]=this.dye[i]=0;
   }
  }
  pattern(x,y){return .5+Math.sin(x*.43+y*.19)*.24+Math.cos(y*.51-x*.17)*.22}
  clear(){for(const key of ['u','v','u0','v0','p','div','driftX','driftY','dye','dye0'])this[key].fill(0);for(const i of this.cells)this.dye[i]=this.pattern(i%this.width,i/this.width|0);this.time=0;this.lastProjection={before:0,after:0}}
  sample(a,x,y){x=clamp(x,0,this.width-1.001);y=clamp(y,0,this.height-1.001);const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,i=iy*this.width+ix,w=this.width;
   return (a[i]*(1-fx)+a[i+1]*fx)*(1-fy)+(a[i+w]*(1-fx)+a[i+w+1]*fx)*fy;
  }
  impulse(x,y,vx,vy,strength=1){const gx=x/this.cellSize-.5,gy=y/this.cellSize-.5,w=this.width;
   for(let yy=Math.max(1,Math.floor(gy-2));yy<=Math.min(this.height-2,Math.ceil(gy+2));yy++)for(let xx=Math.max(1,Math.floor(gx-2));xx<=Math.min(w-2,Math.ceil(gx+2));xx++){
    const i=yy*w+xx;if(!this.mask[i])continue;const f=Math.exp(-((xx-gx)**2+(yy-gy)**2))*strength;
    this.u[i]=clamp(this.u[i]+vx/this.cellSize*f,-8,8);this.v[i]=clamp(this.v[i]+vy/this.cellSize*f,-8,8);
    this.dye[i]=clamp(this.dye[i]+f*.16,0,1);
   }
  }
  boundaries(){const w=this.width;for(const i of this.cells){if(!this.mask[i-1]&&this.u[i]<0||!this.mask[i+1]&&this.u[i]>0)this.u[i]=0;if(!this.mask[i-w]&&this.v[i]<0||!this.mask[i+w]&&this.v[i]>0)this.v[i]=0}}
  divergence(){let sum=0;const w=this.width;for(const i of this.cells){const d=.5*((this.mask[i+1]?this.u[i+1]:0)-(this.mask[i-1]?this.u[i-1]:0)+(this.mask[i+w]?this.v[i+w]:0)-(this.mask[i-w]?this.v[i-w]:0));sum+=d*d}return Math.sqrt(sum/Math.max(1,this.cells.length))}
  project(){const w=this.width,before=this.divergence();this.p.fill(0);this.div.fill(0);
   for(const i of this.cells)this.div[i]=-.5*((this.mask[i+1]?this.u[i+1]:0)-(this.mask[i-1]?this.u[i-1]:0)+(this.mask[i+w]?this.v[i+w]:0)-(this.mask[i-w]?this.v[i-w]:0));
   for(let n=0;n<24;n++)for(const i of this.cells){let total=this.div[i],count=0;
    if(this.mask[i-1]){total+=this.p[i-1];count++}if(this.mask[i+1]){total+=this.p[i+1];count++}if(this.mask[i-w]){total+=this.p[i-w];count++}if(this.mask[i+w]){total+=this.p[i+w];count++}this.p[i]=count?total/count:0}
   for(const i of this.cells){const p=this.p[i];this.u[i]-=.5*((this.mask[i+1]?this.p[i+1]:p)-(this.mask[i-1]?this.p[i-1]:p));this.v[i]-=.5*((this.mask[i+w]?this.p[i+w]:p)-(this.mask[i-w]?this.p[i-w]:p))}
   this.boundaries();this.lastProjection={before,after:this.divergence()};
  }
  diffuse(out,source,amount){const w=this.width;out.set(source);for(let n=0;n<6;n++)for(const i of this.cells){const sum=(this.mask[i-1]?out[i-1]:0)+(this.mask[i+1]?out[i+1]:0)+(this.mask[i-w]?out[i-w]:0)+(this.mask[i+w]?out[i+w]:0);out[i]=(source[i]+amount*sum)/(1+4*amount)}}
  advance(dt,{wind=.35,angle=0,rain=0,drag=.35,viscosity=.12}={}){let remaining=Math.max(0,Math.min(.2,dt));
   while(remaining>0){const step=Math.min(.05,remaining);remaining-=step;this.time+=step;const w=this.width;
    for(const i of this.cells){const x=i%w,y=(i/w)|0,gust=.7+Math.sin(y*.37+this.time*.5)*.3;
     this.u[i]+=step*(Math.cos(angle)*wind*.8*gust+Math.sin(y*.21+this.time*.7)*rain*.12-drag*this.u[i]);
     this.v[i]+=step*(Math.sin(angle)*wind*.8*(.7+Math.sin(x*.31-this.time*.4)*.3)+Math.cos(x*.19-this.time*.6)*rain*.12-drag*this.v[i]);
    }
    this.u0.set(this.u);this.v0.set(this.v);this.diffuse(this.u,this.u0,step*viscosity);this.diffuse(this.v,this.v0,step*viscosity);this.project();
    this.u0.set(this.u);this.v0.set(this.v);
    for(const i of this.cells){const x=i%w-step*this.u0[i],y=(i/w|0)-step*this.v0[i];this.u[i]=this.sample(this.u0,x,y);this.v[i]=this.sample(this.v0,x,y)}
    this.project();
    this.dye0.set(this.dye);
    for(const i of this.cells){const x=i%w,y=i/w|0,advected=this.sample(this.dye0,x-step*this.u[i],y-step*this.v[i]);this.dye[i]=clamp(advected+step*.035*(this.pattern(x,y)-advected),0,1);this.driftX[i]=clamp(this.driftX[i]+this.u[i]*step,-32,32);this.driftY[i]=clamp(this.driftY[i]+this.v[i]*step,-32,32)}
   }
  }
  at(x,y){const gx=x/this.cellSize-.5,gy=y/this.cellSize-.5;return{x:this.sample(this.u,gx,gy),y:this.sample(this.v,gx,gy)}}
  get stats(){let speed=0;for(const i of this.cells)speed=Math.max(speed,Math.hypot(this.u[i],this.v[i]));return{cells:this.cells.length,maxSpeed:speed,divergence:this.divergence(),projection:{...this.lastProjection},bytes:10*this.u.byteLength+this.mask.byteLength}}
 }
 return{Flow};
})();
if(typeof window!=='undefined')window.SurfaceFluid=SurfaceFluid;
if(typeof module!=='undefined')module.exports=SurfaceFluid;
