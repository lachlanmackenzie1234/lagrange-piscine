/* Continuous coloured grain fields; no outlined stones, clods or rock sprites. */
const SurfaceGrain = (() => {
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t;
  const hash=(x,y,s)=>{let n=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^Math.imul(s,1274126177);n=Math.imul(n^n>>>13,1274126177);return((n^n>>>16)>>>0)/4294967296};
  // Periodic colour fields keep a transported texture seamless at map edges.
  const fullDomain={width:512,height:384,footprint:1,seed:0};
  function noise(x,y,size,seed,domain=fullDomain){const nx=Math.max(1,Math.round(domain.width/size)),ny=Math.max(1,Math.round(domain.height/size));x=x/domain.width*nx;y=y/domain.height*ny;seed+=domain.seed||0;
    const ix=Math.floor(x),iy=Math.floor(y),wrap=(a,n)=>(a%n+n)%n;let u=x-ix,v=y-iy;u=u*u*(3-2*u);v=v*v*(3-2*v);
    const at=(xx,yy)=>hash(wrap(xx,nx),wrap(yy,ny),seed);return mix(mix(at(ix,iy),at(ix+1,iy),u),mix(at(ix,iy+1),at(ix+1,iy+1),u),v);
  }
  const palettes={sand:[[208,187,136],[228,208,157],[219,201,149]],earth:[[108,72,44],[176,132,82],[145,110,93]],gravel:[[105,118,122],[178,164,135],[144,131,149]]};
  function sample(type,x,y,wet=0,scale=1,domain=fullDomain){
    const size=SurfaceDynamics.properties[type].grain*scale,p=palettes[type],soil=SurfaceWeather.soil(wet);
    // Below the source pixel footprint, unresolved particles average toward
    // their mean colour. They never alias into larger, false stones.
    const resolved=Math.max(domain.footprint,size),detail=Math.min(1,size/domain.footprint)*(type==='earth'?1-soil.mud*.9:1);
    const warp=(noise(x,y,38,181,domain)-.5)*resolved*1.6;
    const grain=.5+(noise(x+warp,y-warp*.7,resolved,313,domain)-.5)*detail;
    const cluster=noise(x,y,type==='earth'?5+scale*3:Math.max(3,size*7),379,domain),broad=noise(x,y,62,401,domain);
    const aggregates=type==='earth'?(cluster-.5)*soil.aggregates*12:0;
    const contrast=(grain-.5)*(type==='sand'?6:type==='earth'?17:25)+(broad-.5)*10+aggregates,colour=p[0].map((v,k)=>mix(mix(v,p[1][k],grain),p[2][k],cluster*.2));
    return colour.map((v,k)=>clamp(Math.round((v+contrast+(hash((x%domain.width+domain.width)%domain.width,(y%domain.height+domain.height)%domain.height,487)-.5)*3*detail)*(1-wet*(type==='earth'?.36:type==='sand'?.2:.27))+(k===2?wet*2:0)),0,255));
  }
  function paintContact(g,track,type,age,wet,recovery,shade,scale=1,frost=0){const strength=track[type]||0,r=SurfaceDynamics.contact(type,wet,age,recovery),size=SurfaceDynamics.properties[type].grain*scale,mud=type==='earth'?SurfaceWeather.soil(wet,frost).mud:0;
    r.offset*=1-frost;
    g.save();g.translate(Math.round(track.x),Math.round(track.y));g.rotate(track.angle);
    g.globalAlpha=strength*r.shade*shade;g.fillStyle=type==='earth'?'#5c3d2c':'#4b5352';g.fillRect(-2,-4,4,7);
    // Recombine a small patch of the same colour grains around the pressure
    // point. Coarse gravel barely shifts; fine grains can move further.
    for(let y=-5;y<=5;y+=Math.max(1,size))for(let x=-6;x<=6;x+=Math.max(1,size)){
      const distance=Math.hypot(x/7,y/6);if(distance>1)continue;const h=hash(x+track.seed,y,521),dx=x+r.offset*(x<0?-1:1)*(1-distance);
      const rgb=sample(type,track.x+x,track.y+y,wet,scale);g.fillStyle=`rgb(${rgb.join(',')})`;g.globalAlpha=strength*r.rest*(.18+h*.23)*(1-distance*.6)*(1-mud*.75);
      g.fillRect(Math.round(dx*2)/2,Math.round((y+r.offset*.25)*2)/2,Math.max(.5,Math.round(size*2)/2),Math.max(.5,Math.round(size*2)/2));
    }
    // Saturated fines shear as a smooth pressure wake rather than kicked clods.
    if(mud>.01){const spread=1+Math.min(age,1.8)*1.5;
      for(let y=-5;y<=5;y++){const width=Math.sqrt(Math.max(0,1-y*y/36))*(3+spread);
        g.globalAlpha=strength*mud*r.rest*.24;g.fillStyle='#4c4034';g.fillRect(-width,y,width*2,1);
        g.globalAlpha*=.7;g.fillStyle='#ad9780';g.fillRect(width,y,1,1);
      }
    }g.restore();
  }
  return {sample,paintContact};
})();
if(typeof window!=='undefined')window.SurfaceGrain=SurfaceGrain;
if(typeof module!=='undefined')module.exports=SurfaceGrain;
