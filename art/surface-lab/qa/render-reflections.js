(() => {
 const out=document.createElement('canvas');out.width=1024;out.height=832;const g=out.getContext('2d');
 const tile=document.createElement('canvas');tile.width=512;tile.height=384;const p=tile.getContext('2d');
 const f=new TerrainStudy.Field({layout:'stream',length:25,grain:.25,moisture:.9,rain:.9,wind:.5,sun:.15,humidity:.9,temperature:14,reflectionStrength:1,lightPalette:'sky',colourDriver:'weather',studyHour:16});
 for(let i=0;i<100;i++)f.weather.advance(.25,{...f.options,speed:1});f.syncWater();
 const hero={x:220,y:230};for(let i=0;i<15;i++)f.advance(1/30,hero);
 const draw=()=>{p.save();p.translate(hero.x,hero.y);p.scale(2,2);QuestMotion.keeper(p,0,0,{hair:1,skin:'#e9b886',hairColor:'#4a2e1a'},{},{motion:'idle',elapsed:0,direction:'south'});p.restore()};
 const show=(index,label,options)=>{f.configure(options);f.paint(p,hero,draw,()=>{},false);g.save();g.translate(index%2*512,Math.floor(index/2)*416);g.fillStyle='#f2efd9';g.fillRect(0,0,512,416);g.fillStyle='#263d35';g.font='17px Pixel,monospace';g.fillText(label,10,22);g.filter=SurfaceColour.filter(SurfaceAdaptiveColour.grade({palette:'coast',view:f.options.reflectionView?'reflections':'colour',contrast:1,saturation:1,exposure:1},f.adaptive,f.options.adaptation));g.drawImage(tile,0,32);g.restore()};
 show(0,'WET SURFACES · SHARED WHITE HIGHLIGHTS',{reflectionView:false});
 show(1,'REFLECTION MASK · ALL MATERIALS',{reflectionView:true});
 show(2,'WEATHER + TIME · WARM EVENING',{reflectionView:false,studyHour:18.5,rain:0,sun:.85});
 show(3,'WEATHER + TIME · COOL NIGHT',{studyHour:1});
 f.dispose();return out.toDataURL('image/png');
})()
