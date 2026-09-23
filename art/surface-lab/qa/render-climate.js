(() => {
 const panelW=512,panelH=416,output=document.createElement('canvas');output.width=1024;output.height=832;
 const g=output.getContext('2d');g.imageSmoothingEnabled=false;
 const cases=[
  {season:'spring',title:'SPRING · HUMID / FINE SOIL',weather:{...SurfaceWeather.presets.calm,temperature:16,humidity:.75,rain:.3},seconds:30},
  {season:'summer',title:'SUMMER · 40°C / DRYING SHORE',weather:SurfaceWeather.presets.heat,seconds:60},
  {season:'autumn',title:'AUTUMN · RAIN / SOFT MUD',weather:SurfaceWeather.presets.rain,seconds:35},
  {season:'winter',title:'WINTER · −2°C / FROZEN WATER',weather:SurfaceWeather.presets.frost,seconds:100},
 ];
 const report=[];
 for(let n=0;n<cases.length;n++){
  const c=cases[n],field=new TerrainStudy.Field({...c.weather,grain:.25,moisture:.35,seasonFrom:c.season,seasonTo:c.season,seasonBlend:0});
  for(let i=0;i<c.seconds*4;i++)field.weather.advance(.25,c.weather);field.syncWater();
  const hero={x:260,y:285},draw=()=>{g.save();g.translate(hero.x,hero.y);g.scale(2,2);QuestMotion.keeper(g,0,0,{hair:1,skin:'#e9b886',hairColor:'#4a2e1a'},{},{motion:'idle',elapsed:0,direction:'south',light:'sun'});g.restore()};
  g.save();g.translate((n%2)*panelW,Math.floor(n/2)*panelH);g.fillStyle='#f2efd9';g.fillRect(0,0,panelW,panelH);g.fillStyle='#263d35';g.font='17px Pixel,monospace';g.fillText(c.title,12,22);g.translate(0,32);field.paint(g,hero,draw,()=>{},true);g.restore();
  report.push({season:c.season,moisture:field.wetness('earth'),ice:field.weather.ice,waterLoss:field.weather.waterLoss});
 }
 return{image:output.toDataURL('image/png'),states:report};
})()
