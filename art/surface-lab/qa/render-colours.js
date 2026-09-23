(() => {
 const output=document.createElement('canvas');output.width=1024;output.height=832;const g=output.getContext('2d');
 const surface=document.createElement('canvas');surface.width=512;surface.height=384;const s=surface.getContext('2d');
 const hero={x:260,y:285},field=new TerrainStudy.Field({grain:.25,wind:0,richness:1.45,seasonFrom:'summer',seasonTo:'autumn',seasonBlend:.25});
 const cases=[
  {label:'1 · RICH SEASONAL PIGMENT',lightStrength:0,lightPalette:'sun',grade:'none'},
  {label:'2 · WARM LIGHT / BLUE SHADOW',lightStrength:1,lightPalette:'sun',grade:'none'},
  {label:'2 · GOLD LIGHT / VIOLET SHADOW',lightStrength:1,lightPalette:'amber',grade:'none'},
  {label:'3 · GREYSCALE / CONTRAST GRADE',lightStrength:1,lightPalette:'amber',grade:'grayscale(1) contrast(1.3) brightness(.98)'},
 ];
 for(let n=0;n<cases.length;n++){
  const p=cases[n];field.configure({lightPalette:p.lightPalette,lightStrength:p.lightStrength,lightSaturation:1.5});
  const draw=()=>{s.save();s.translate(hero.x,hero.y);s.scale(2,2);QuestMotion.keeper(s,0,0,{hair:1,skin:'#e9b886',hairColor:'#4a2e1a'},{},{motion:'idle',elapsed:0,direction:'south',light:'sun'});s.restore()};
  field.paint(s,hero,draw,()=>{},true);g.save();g.translate((n%2)*512,Math.floor(n/2)*416);g.fillStyle='#f2efd9';g.fillRect(0,0,512,416);g.fillStyle='#263d35';g.font='17px Pixel,monospace';g.fillText(p.label,12,22);g.filter=p.grade;g.drawImage(surface,0,32);g.restore();
 }
 return output.toDataURL('image/png');
})()
