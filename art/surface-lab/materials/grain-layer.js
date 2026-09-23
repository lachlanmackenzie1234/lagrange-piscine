/* Four reusable grain scales blended through stationary, low-resolution masks.
 * The textures advect; region sizes, edges and worn paths stay in world space. */
const SurfaceGrainLayer = (() => {
  const W=512,H=384,TILE=64,RES=2,LEVELS=[.25,.75,1.5,3];
  const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
  function weights(size){const out=[0,0,0,0];if(size<=LEVELS[0])out[0]=1;else if(size>=LEVELS[3])out[3]=1;else for(let i=0;i<3;i++)if(size>=LEVELS[i]&&size<=LEVELS[i+1]){const t=(size-LEVELS[i])/(LEVELS[i+1]-LEVELS[i]);out[i]=1-t;out[i+1]=t;break}return out}
  class Layer{
    constructor(type,variation,scratch,res=RES){
      this.type=type;this.variation=variation;this.scratch=scratch;this.res=res;this.output=canvas(W*res,H*res);this.mask=canvas(W,H);
      this.bands=LEVELS.map(()=>{const mask=canvas(64,48);return{mask,data:mask.getContext('2d').createImageData(64,48)}});this.sources=[];this.active=false;
    }
    configure(options,season){
      const key=JSON.stringify([options.grain,options.richness,season[this.type]]);if(key===this.sourceKey)return;
      this.sourceKey=key;this.sources.length=0;const scratch=this.scratch.getContext('2d');
      for(let n=0;n<LEVELS.length;n++){
        const pair={};for(const [name,wet] of [['dry',0],['wet',1]]){
          const RES=this.res,image=canvas(TILE*RES,TILE*RES),g=image.getContext('2d'),data=g.createImageData(image.width,image.height),domain={width:TILE,height:TILE,footprint:1/RES,seed:n*31};
          for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++){
            const rgb=SurfaceColour.tint(SurfaceGrain.sample(this.type,x/RES,y/RES,wet,options.grain*2*LEVELS[n],domain),this.type,season,options.richness),i=(y*image.width+x)*4;
            data.data[i]=rgb[0];data.data[i+1]=rgb[1];data.data[i+2]=rgb[2];data.data[i+3]=255;
          }
          g.putImageData(data,0,0);pair[name]=image;pair[name+'Pattern']=scratch.createPattern(image,'repeat');
        }this.sources.push(pair);
      }this.tick=null;
    }
    setMask(data){this.mask.getContext('2d').putImageData(data,0,0);this.active=false;for(let i=3;i<data.data.length;i+=4)if(data.data[i]){this.active=true;break}this.tick=null;this.maskRevision=-1}
    updateBands(){
      if(this.maskRevision===this.variation.revision)return;
      for(let i=0;i<64*48;i++){
        const blend=weights(this.variation.value(this.type,i));
        for(let n=0;n<4;n++){const d=this.bands[n].data.data,j=i*4;d[j]=d[j+1]=d[j+2]=255;d[j+3]=Math.round(blend[n]*255)}
      }
      for(const band of this.bands)band.mask.getContext('2d').putImageData(band.data,0,0);
      this.maskRevision=this.variation.revision;
    }
    render(offset={x:0,y:0},wet=0,refresh=true){
      if(!this.active)return;if(refresh||this.maskRevision==null||this.maskRevision<0)this.updateBands();
      const RES=this.res,x=Math.round(offset.x*RES),y=Math.round(offset.y*RES),water=Math.round(wet*64)/64,key=[x,y,water,this.maskRevision].join('/');if(key===this.tick)return;
      const out=this.output.getContext('2d'),g=this.scratch.getContext('2d');out.clearRect(0,0,W*RES,H*RES);out.globalCompositeOperation='lighter';
      for(let n=0;n<4;n++){
        g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,W*RES,H*RES);g.imageSmoothingEnabled=false;g.globalCompositeOperation='source-over';g.globalAlpha=1;
        g.setTransform(1,0,0,1,x,y);g.fillStyle=this.sources[n].dryPattern;g.fillRect(-x,-y,W*RES,H*RES);
        if(water){g.globalAlpha=water;g.fillStyle=this.sources[n].wetPattern;g.fillRect(-x,-y,W*RES,H*RES)}
        g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.imageSmoothingEnabled=true;g.globalCompositeOperation='destination-in';g.drawImage(this.bands[n].mask,0,0,W*RES,H*RES);
        out.drawImage(this.scratch,0,0);
      }
      out.globalCompositeOperation='destination-in';out.imageSmoothingEnabled=false;out.drawImage(this.mask,0,0,W*RES,H*RES);out.globalCompositeOperation='source-over';
      g.globalCompositeOperation='source-over';g.fillStyle='#000';this.tick=key;
    }
    get bytes(){return this.disposed?0:this.output.width*this.output.height*4+W*H*4+this.bands.length*64*48*8+this.sources.length*2*TILE*TILE*this.res*this.res*4}
    dispose(){for(const c of [this.output,this.mask,...this.bands.map(b=>b.mask),...this.sources.flatMap(s=>[s.dry,s.wet])])c.width=c.height=1;this.sources.length=0;this.bands.length=0;this.disposed=true}
  }
  return{Layer,LEVELS,weights};
})();
if(typeof window!=='undefined')window.SurfaceGrainLayer=SurfaceGrainLayer;
if(typeof module!=='undefined')module.exports=SurfaceGrainLayer;
