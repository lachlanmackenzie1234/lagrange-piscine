/* Seeded, continuous material maps. All five weights sum to one. */
const SurfaceMaps = (() => {
  const W = 512, H = 384, types = ['grass', 'sand', 'earth', 'gravel', 'water'];
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, x) => { const t = clamp((x-a)/(b-a)); return t*t*(3-2*t); };
  const edge = (distance, blend) => blend ? smooth(-blend/2, blend/2, distance) : Number(distance >= 0);
  const ellipse = (x,y,cx,cy,rx,ry) => (1-Math.hypot((x-cx)/rx,(y-cy)/ry))*Math.min(rx,ry);
  function mix(base, kind, amount) { const out={}; for(const t of types) out[t]=(base[t]||0)*(1-amount);out[kind]+=amount;return out; }
  function sample(x,y,blend=24,mode='blend',layout='garden') {
    if(types.includes(mode)) return Object.fromEntries(types.map(t=>[t,Number(t===mode)]));
    let m={grass:1,sand:0,earth:0,gravel:0,water:0};
    if(layout==='coast') {
      m={grass:0,sand:1,earth:0,gravel:0,water:0};
      const turf=Math.max(ellipse(x,y,380,84,170,100),ellipse(x,y,73,43,70,65));
      m=mix(m,'grass',edge(turf,blend));
      m=mix(m,'earth',edge(ellipse(x,y,392,286,105,79),blend)*.93);
      m=mix(m,'gravel',edge(17-Math.abs(y-(324-x*.14+Math.sin(x/74)*14)),blend*.7)*.94);
      const pond=ellipse(x,y,163,210,108,82)+Math.sin(x*.047+y*.021)*2;
      m=mix(m,'sand',edge(pond+18,blend));m=mix(m,'water',edge(pond,Math.max(5,blend*.6)));
    } else if(layout==='stream') {
      m={grass:.12,sand:0,earth:.28,gravel:.6,water:0};
      m=mix(m,'grass',edge(ellipse(x,y,64,112,160,192),blend));
      m=mix(m,'earth',edge(ellipse(x,y,436,283,155,145),blend));
      const river=27-Math.abs(x-(257+Math.sin(y/73)*44+Math.sin(y/29)*8));
      m=mix(m,'gravel',edge(river+30,blend));m=mix(m,'sand',edge(river+12,blend)*.78);m=mix(m,'water',edge(river,Math.max(5,blend*.65)));
    } else {
      const lane=36-Math.abs(x-(222+y*.36+Math.sin(y/51)*25));
      m=mix(m,'earth',edge(lane,blend));
      const track=18-Math.abs(y-(318-x*.075+Math.sin(x/78)*13));
      m=mix(m,'gravel',edge(track,blend*.7));
      m=mix(m,'sand',edge(ellipse(x,y,94,315,82,45),blend)*.9);
      const pond=ellipse(x,y,392,115,79,56)+Math.sin(y*.11+x*.02)*2;
      m=mix(m,'sand',edge(pond+17,blend));m=mix(m,'gravel',edge(pond+7,blend*.7)*.35);m=mix(m,'water',edge(pond,Math.max(5,blend*.55)));
    }
    return m;
  }
  function depth(x,y,layout='garden',mode='blend') {
    if(mode==='water')return clamp(.25+Math.sin(x/110)*.1+y/H*.45);
    if(layout==='coast')return clamp(ellipse(x,y,163,210,108,82)/70);
    if(layout==='stream')return clamp(1-Math.abs(x-(257+Math.sin(y/73)*44+Math.sin(y/29)*8))/32)*.65;
    return clamp(ellipse(x,y,392,115,79,56)/48)*.85;
  }
  const layouts={garden:'Rain garden',coast:'Dune pond',stream:'Gravel stream'};
  const tours={garden:[[300,274],[418,308],[393,112],[279,111],[113,140],[91,318]],coast:[[385,297],[185,231],[132,155],[350,84],[459,217],[286,329]],stream:[[114,146],[252,165],[408,108],[394,290],[270,286],[88,320]]};
  return {W,H,types,layouts,sample,depth,tour:id=>(tours[id]||tours.garden).map(p=>p.slice()),spawn:id=>({x:(tours[id]||tours.garden)[0][0],y:(tours[id]||tours.garden)[0][1]})};
})();
if(typeof window!=='undefined')window.SurfaceMaps=SurfaceMaps;
if(typeof module!=='undefined')module.exports=SurfaceMaps;
