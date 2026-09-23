(() => {
 const out=document.createElement('canvas');out.width=1024;out.height=832;const g=out.getContext('2d');
 const tile=document.createElement('canvas');tile.width=512;tile.height=384;const p=tile.getContext('2d');
 const frame=(index,label,field,hero,actor=true)=>{
  const draw=()=>{if(!actor)return;p.save();p.translate(hero.x,hero.y);p.scale(2,2);QuestMotion.keeper(p,0,0,{hair:1,skin:'#e9b886',hairColor:'#4a2e1a'},{},{motion:'walk',elapsed:field.time*1000,direction:'east'});p.restore()};
  field.paint(p,hero,draw,()=>{},false);g.save();g.translate(index%2*512,Math.floor(index/2)*416);g.fillStyle='#f2efd9';g.fillRect(0,0,512,416);g.fillStyle='#263d35';g.font='17px Pixel,monospace';g.fillText(label,10,22);g.drawImage(tile,0,32);g.restore();
 };
 for(let n=0;n<2;n++){
  const season=n?'winter':'spring',f=new TerrainStudy.Field({mode:'grass',length:28,wind:.25,temperature:n?-6:16,humidity:.9,rain:0,seasonFrom:season,seasonTo:season,richness:1.5,lightPalette:n?'sky':'sun'});
  f.weather.moisture.grass=.9;f.weather.frost=n?.85:0;const hero={x:174,y:223};f.lastHero={...hero};
  for(let i=0;i<50;i++){hero.x+=1;f.advance(1/30,hero)}
  frame(n,n?'FROST · MATCHED FOREGROUND GRASS':'WET SPRING · MATCHED PASSAGE COLOUR',f,hero);f.dispose();
 }
 const f=new TerrainStudy.Field({mode:'blend',grain:1,variation:.8,edgeGrain:1,pathWear:1,wind:0,moisture:0});
 frame(2,'GRAIN PATCHES / COARSER MATERIAL EDGES',f,{x:-40,y:-40},false);
 for(let pass=0;pass<8;pass++)for(let x=62;x<461;x+=8)f.stampStep({x,y:318-x*.075+Math.sin(x/78)*13},40,0);
 f.clearTracks();frame(3,'SAME MAP / FINER WORN TRAVEL LINE',f,{x:-40,y:-40},false);f.dispose();
 return out.toDataURL('image/png');
})()
