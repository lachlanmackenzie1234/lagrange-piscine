/* Lagrange Quest · Lacanau field kit / visual trials v1.
 * Standalone integer-pixel source. No game state, DOM, randomness or dependencies.
 * All colours come from js/game.js or the existing Pixel theme.
 */
export const P = Object.freeze({
  ink:'#20203a', paper:'#fffbe9', cream:'#f6f1dc', white:'#ffffff',
  sand:'#e9d59a', straw:'#f2c14e', ochre:'#c9a55a', wood:'#8a4a1e',
  skin:'#e8b88a', skinLight:'#f4efe0', skinDark:'#c98a4a', hair:'#4a2e1a',
  blueLight:'#7ec8ff', blue:'#2f4fdf', blueDark:'#1a1c5a',
  greenLight:'#b5f27a', green:'#2aa845', greenDark:'#124d2a',
  goldLight:'#f2c14e', gold:'#e39b12', goldDark:'#8a4a1e',
  purpleLight:'#c9b6e8', purple:'#7b3fc4', purpleDark:'#3a1a5a',
  tealLight:'#8ee6d2', teal:'#1f9e8a', tealDark:'#0f4a42',
  waterLight:'#8ed4ff', water:'#4aa8ff', waterDark:'#2f7fd6',
  stoneLight:'#f4efe0', stone:'#c9c0a8', stoneDark:'#7a7a90',
  steelLight:'#b8c4d6', steel:'#5a6b8a', steelDark:'#26304a',
  redLight:'#ffb3a7', red:'#d82f2f', redDark:'#5a1a1a', common:'#6b7a87',
});
export const SETS = [
  {id:'EC',name:'Pool Boy',subtitle:'Eden Club',motif:'Backward cap · square net · rubber clogs',pal:[P.blueLight,P.blue,P.blueDark],creature:'Écume',creatureNote:'A wave-crested pool otter.',items:['Casquette','Polo','Short cargo','Crocs','Sifflet','Perche télescopique','Robot Dolphin','Balai de fond']},
  {id:'AG',name:'Surfeur des dunes',subtitle:'Atlantic Green',motif:'Floppy brim · bamboo joints · wave stripe',pal:[P.greenLight,P.green,P.greenDark],creature:'Oyatin',creatureNote:'A dune gecko with a marram-grass tail.',items:['Bob','Combinaison 3/2','Boardshort','Chaussons néoprène','Dent de requin','Perche en bambou','Robot Longboard','Balai wax']},
  {id:'EP',name:'Jardinier du golf',subtitle:'Eden Parc',motif:'Wide straw brim · patch pockets · rake teeth',pal:[P.goldLight,P.gold,P.goldDark],creature:'Pignotte',creatureNote:'A pinecone sprite with a needle tuft.',items:['Chapeau de paille','Gilet à poches','Pantalon kaki','Bottes de jardin','Trèfle à quatre feuilles','Râteau-perche','Robot tondeuse égaré','Balai brosse']},
  {id:'EPP',name:'Locataire',subtitle:'Eden Parc Pitch',motif:'Huge sunglasses · swimwear · inflatable ring',pal:[P.purpleLight,P.purple,P.purpleDark],creature:'Bouémitte',creatureNote:'A tiny hermit who found a swim ring.',items:['Lunettes de soleil','Marcel','Slip de bain','Tongs','Bracelet all-inclusive','Épuisette à crevettes','Robot gonflable','Balai du placard']},
  {id:'GP',name:'Gardien du Green',subtitle:'Green Parc',motif:'Visor · windbreaker stripe · key-shaped hook',pal:[P.tealLight,P.teal,P.tealDark],creature:'Clapot',creatureNote:'A watchful reed frog with a key-like crest.',items:['Visière','Coupe-vent','Jogging','Baskets','Clé du local','Perche du gardien','Robot de garde','Balai de ronde']},
];
export const SLOTS = ['tête','torse','jambes','pieds','amulette','perche','robot','balai'];
export const SLOT_IDS = ['head','body','legs','feet','charm','pole','robot','broom'];
export const RARITIES = [
  {id:'common',name:'Commun',color:P.common,rank:1},
  {id:'uncommon',name:'Peu commun',color:P.green,rank:2},
  {id:'rare',name:'Rare',color:P.blue,rank:3},
  {id:'vrare',name:'Très rare',color:P.purple,rank:4},
  {id:'epic',name:'Épique',color:P.gold,rank:5},
  {id:'legend',name:'Légendaire',color:P.red,rank:6},
];
export const MONSTERS = [
  {id:'algue',name:'Algue verte',note:'Algae crown, crab claws, low centre of gravity.',pal:[P.greenLight,P.green,P.greenDark]},
  {id:'calcaire',name:'Calcaire',note:'An angular chalk shell on a stubborn little snail.',pal:[P.stoneLight,P.stone,P.stoneDark]},
  {id:'filtre',name:'Filtre saturé',note:'A pressure-gauge eye and two heavy pipe feet.',pal:[P.steelLight,P.steel,P.steelDark]},
];
const rgba = new Map();
function color(hex){
  if (!rgba.has(hex)) {const n=parseInt(hex.slice(1),16);rgba.set(hex,[n>>16&255,n>>8&255,n&255,255]);}
  return rgba.get(hex);
}
export class Raster {
  constructor(width,height){this.width=width;this.height=height;this.data=new Uint8ClampedArray(width*height*4);}
  dot(x,y,c){x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=this.width||y>=this.height)return this;const i=(y*this.width+x)*4;this.data.set(color(c),i);return this;}
  rect(x,y,w,h,c){for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)this.dot(i,j,c);return this;}
  line(x0,y0,x1,y1,c,w=1){const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;let err=dx+dy;for(;;){this.rect(x0,y0,w,w,c);if(x0===x1&&y0===y1)break;const e=2*err;if(e>=dy){err+=dy;x0+=sx;}if(e<=dx){err+=dx;y0+=sy;}}return this;}
  poly(points,c){
    const minX=Math.max(0,Math.floor(Math.min(...points.map(p=>p[0])))),maxX=Math.min(this.width-1,Math.ceil(Math.max(...points.map(p=>p[0]))));
    const minY=Math.max(0,Math.floor(Math.min(...points.map(p=>p[1])))),maxY=Math.min(this.height-1,Math.ceil(Math.max(...points.map(p=>p[1]))));
    for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
      let inside=false;
      for(let i=0,j=points.length-1;i<points.length;j=i++){
        const [xi,yi]=points[i],[xj,yj]=points[j];
        if((yi>y+.5)!==(yj>y+.5)&&(x+.5<(xj-xi)*(y+.5-yi)/(yj-yi)+xi))inside=!inside;
      }
      if(inside)this.dot(x,y,c);
    }return this;
  }
  oval(x,y,w,h,c){for(let j=0;j<h;j++)for(let i=0;i<w;i++)if(((i+.5-w/2)/(w/2))**2+((j+.5-h/2)/(h/2))**2<=1)this.dot(x+i,y+j,c);return this;}
  blit(src,x,y,scale=1,flip=false){for(let j=0;j<src.height;j++)for(let i=0;i<src.width;i++){const k=(j*src.width+i)*4;if(src.data[k+3]){const c='#'+[...src.data.slice(k,k+3)].map(n=>n.toString(16).padStart(2,'0')).join('');this.rect(x+(flip?src.width-1-i:i)*scale,y+j*scale,scale,scale,c);}}return this;}
  /* Shade only opaque shape pixels; expand a 4-neighbour ink contour by one pixel. */
  form(points,pal){
    const m=new Raster(this.width,this.height);m.poly(points,pal[1]);
    const on=(x,y)=>x>=0&&y>=0&&x<this.width&&y<this.height&&m.data[(y*this.width+x)*4+3];
    const maxY=Math.max(...points.map(p=>p[1])),minY=Math.min(...points.map(p=>p[1]));
    for(let y=0;y<this.height;y++)for(let x=0;x<this.width;x++)if(on(x,y))for(const [dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]])if(!on(x+dx,y+dy))this.dot(x+dx,y+dy,P.ink);
    for(let y=0;y<this.height;y++)for(let x=0;x<this.width;x++)if(on(x,y))this.dot(x,y,!on(x,y-1)||!on(x-1,y)?pal[0]:!on(x+1,y)||y>minY+(maxY-minY)*.72?pal[2]:pal[1]);
    return this;
  }
}
const creamRamp=[P.paper,P.sand,P.ochre],metalRamp=[P.steelLight,P.steel,P.steelDark];
const skinRamp=[P.skinLight,P.skin,P.skinDark];
function eyes(r,x,y,gap=5,angry=false){
  r.rect(x,y,2,3,P.paper).rect(x+gap,y,2,3,P.paper);
  r.rect(x+1,y+1,1,2,P.ink).rect(x+gap+1,y+1,1,2,P.ink);
  if(angry){r.line(x-1,y-1,x+2,y,P.ink);r.line(x+gap,y,x+gap+3,y-1,P.ink);}
}
function hat(r,set,ox,oy,small=false){
  const p=set.pal;
  if(small){
    if(set.id==='EC'){r.form([[5,4],[11,4],[13,6],[13,10],[4,10],[4,6]],p);r.form([[1,9],[8,9],[8,11],[2,11]],p);r.rect(10,7,2,2,P.paper);}
    if(set.id==='AG'){r.form([[5,3],[11,4],[12,8],[15,10],[13,12],[2,12],[1,10],[4,8]],p);r.rect(4,8,8,1,P.cream).rect(6,5,2,2,P.sand);}
    if(set.id==='EP'){r.form([[2,7],[5,6],[5,3],[10,3],[12,7],[15,8],[14,11],[2,11],[1,9]],creamRamp);r.rect(5,6,7,2,P.wood);r.dot(4,9,P.ochre);r.dot(7,10,P.ochre);r.dot(11,9,P.ochre);}
    if(set.id==='EPP'){r.form([[2,6],[7,6],[8,7],[9,6],[14,6],[14,10],[12,12],[10,11],[9,8],[7,8],[6,11],[3,11]],p);r.rect(3,7,3,2,P.ink).rect(10,7,3,2,P.ink);r.dot(3,7,P.paper);r.dot(10,7,P.paper);}
    if(set.id==='GP'){r.form([[4,4],[12,5],[13,8],[15,9],[14,11],[2,10],[2,8],[4,7]],p);r.rect(5,5,6,1,P.paper).rect(5,6,6,1,P.skin);}
    return;
  }
  const b=new Raster(24,14);
  if(set.id==='EC'){b.form([[8,3],[16,2],[19,5],[19,9],[7,9],[7,5]],p);b.form([[3,7],[11,7],[11,10],[4,10]],p);b.rect(15,5,3,2,P.paper).rect(15,7,3,1,p[2]);}
  if(set.id==='AG'){b.form([[8,2],[17,3],[18,7],[21,9],[19,11],[6,11],[4,9],[7,7]],p);b.rect(7,7,11,1,P.cream).rect(10,4,3,2,P.sand);}
  if(set.id==='EP'){b.form([[3,7],[8,5],[9,2],[16,2],[18,6],[22,8],[20,11],[4,11],[2,9]],creamRamp);b.rect(8,5,10,2,P.wood);b.dot(5,9,P.ochre);b.dot(11,9,P.ochre);b.dot(17,9,P.ochre);}
  if(set.id==='EPP'){b.rect(7,9,14,2,P.purpleDark).rect(8,9,5,3,P.ink).rect(15,9,5,3,P.ink).rect(9,9,2,1,P.purpleLight).rect(16,9,2,1,P.paper);}
  if(set.id==='GP'){b.form([[7,5],[18,5],[20,7],[22,8],[21,10],[7,9]],p);b.rect(8,5,10,1,P.paper).rect(10,6,6,1,p[2]);}
  r.blit(b,ox,oy);
}
export function trainer(setId='EC',frame=0){
  const set=SETS.find(s=>s.id===setId)||SETS[0],p=set.pal,r=new Raster(24,32);
  const a=frame===1?1:0,b=frame===2?1:0;
  // The oversized working pole leaves a strong silhouette at native resolution.
  r.line(3,8,3,27,P.ink,2);r.line(3,9,3,26,set.id==='AG'?P.wood:P.steelLight);
  if(set.id==='EP'){r.rect(1,5,6,2,P.ink);[1,3,5].forEach(x=>r.rect(x,6,1,3,P.gold));}
  else if(set.id==='AG'){r.line(3,2,3,17,P.ink,2);r.line(3,2,3,17,P.wood);[4,9,14,23].forEach(y=>r.rect(3,y,2,1,P.sand));}
  else if(set.id==='GP'){r.form([[2,2],[5,2],[7,4],[7,7],[5,7],[5,4],[3,4],[3,8],[1,8],[1,4]],metalRamp);}
  else {r.form([[2,2],[5,2],[6,4],[5,8],[1,8],[1,4]],p);r.rect(2,4,3,3,P.waterLight).dot(3,5,P.paper);}
  // Legs, then shoes; light side and dark side make the 3/4 pose readable.
  const long=['EP','GP'].includes(set.id);
  r.form([[8,21],[18,21],[18,28-b],[14,29-b],[12,25],[11,29-a],[7,29-a]],long?p:[P.steelLight,P.steel,P.steelDark]);
  if(!long)r.rect(8,26-a,3,3,P.skin).rect(14,26-b,3,3,P.skin);
  r.form([[7,28-a],[11,28-a],[12,31-a],[6,31-a],[6,30-a]],p);
  r.form([[14,28-b],[18,28-b],[20,30-b],[19,31-b],[14,31-b]],p);
  if(set.id==='EPP'){r.rect(7,29-a,4,1,P.skin).rect(15,29-b,3,1,P.skin);}
  if(set.id==='EC'){r.dot(8,29-a,P.ink);r.dot(16,29-b,P.ink);}
  // Hands, rounded shoulders, waist pouch and characteristic garment marks.
  r.form([[7,15],[7,21],[4,22],[3,19],[5,16]],skinRamp);
  r.form([[18,15],[20,17],[21,21],[18,22]],skinRamp);
  r.form([[9,13],[16,13],[19,16],[18,23],[8,24],[6,20],[7,16]],set.id==='EPP'?creamRamp:p);
  r.rect(9,14,2,2,P.paper).rect(14,14,2,2,P.paper);
  r.line(11,16,12,20,set.id==='AG'?P.cream:p[2]);
  if(set.id==='EP'){r.rect(8,17,3,3,P.ochre).rect(14,17,3,3,P.ochre).rect(8,17,3,1,P.sand).rect(14,17,3,1,P.sand);}
  if(set.id==='GP')r.line(8,17,17,19,P.paper);
  if(set.id==='AG')r.rect(8,21,9,1,P.cream);
  r.rect(8,22,10,2,P.wood).rect(12,21,4,3,P.ink).rect(12,21,3,2,P.sand).dot(13,21,P.paper);
  r.rect(3,18,3,3,P.skin).dot(3,18,P.skinLight);
  // Head and asymmetric fringe; face stays identical across the wardrobe study.
  r.form([[9,6],[17,6],[19,8],[19,11],[21,12],[19,13],[17,15],[11,15],[8,12],[8,8]],skinRamp);
  r.poly([[8,6],[10,4],[16,4],[19,6],[19,8],[14,7],[12,9],[9,9],[9,12],[7,10]],P.hair);
  r.rect(12,10,2,2,P.paper).dot(13,11,P.ink).rect(17,10,1,2,P.ink).dot(17,13,P.skinDark).rect(14,14,2,1,P.wood);
  hat(r,set,0,0);
  return r;
}
export function icon(setId='EC',slot='head',rarity='common'){
  const s=SETS.find(x=>x.id===setId)||SETS[0],p=s.pal,r=new Raster(16,16),i=SETS.indexOf(s);
  if(slot==='head')hat(r,s,0,0,true);
  if(slot==='body'){
    const cuts=[
      [[5,3],[6,4],[9,4],[10,3],[14,5],[15,8],[12,9],[12,13],[4,13],[4,9],[1,8],[2,5]],
      [[5,2],[7,4],[9,4],[11,2],[14,4],[15,11],[12,11],[11,14],[4,14],[4,11],[1,11],[2,4]],
      [[4,3],[6,3],[7,5],[9,5],[10,3],[12,3],[11,7],[12,13],[3,13],[4,7]],
      [[5,3],[6,3],[6,6],[10,6],[10,3],[11,3],[12,12],[10,14],[5,14],[3,12]],
      [[5,2],[10,2],[12,4],[15,5],[15,11],[12,11],[12,14],[4,14],[4,10],[1,10],[2,5],[4,4]],
    ];
    r.form(cuts[i],i===3?creamRamp:p);
    if(i===0||i===4)r.poly([[5,3],[8,6],[6,7],[4,5]],P.paper).poly([[10,3],[8,6],[10,7],[12,5]],P.paper);
    if(i===1){r.line(8,5,8,12,P.cream);r.rect(4,10,8,1,p[2]);}
    if(i===2){r.rect(4,8,3,3,P.sand).rect(9,8,3,3,P.sand).rect(4,8,3,1,P.wood).rect(9,8,3,1,P.wood);}
    if(i===3){r.rect(5,12,7,1,p[1]);}
    if(i===4){r.line(3,7,11,9,P.paper);r.line(8,5,8,12,p[2]);}
  }
  if(slot==='legs'){
    const h=i===2||i===4?14:11;
    if(i===3){r.form([[3,5],[13,5],[12,9],[8,12],[4,9]],p);r.rect(4,5,8,1,P.paper);}
    else {r.form([[4,3],[12,3],[13,h],[9,h],[8,8],[7,h],[3,h]],i===2?creamRamp:p);r.rect(4,3,8,1,P.wood).dot(7,3,P.paper);if(i===0)r.rect(3,7,3,2,p[2]).rect(10,7,3,2,p[2]);if(i===1)r.line(4,7,11,8,P.paper);if(i===4)r.line(4,5,4,12,P.paper);}
  }
  if(slot==='feet'){
    for(const [x,y]of[[2,1],[9,0]]){
      if(i===3){r.form([[x+1,7+y],[x+4,7+y],[x+5,12+y],[x+4,14+y],[x,14+y],[x,10+y]],creamRamp);r.line(x+1,9+y,x+3,12+y,p[1]);r.line(x+3,12+y,x+4,9+y,p[1]);}
      else {const tall=i===2?4:7;r.form([[x+1,tall+y],[x+4,tall+y],[x+4,10+y],[x+5,11+y],[x+5,13+y],[x,13+y],[x,10+y]],p);r.rect(x,12+y,5,1,P.sand);if(i===0){r.dot(x+1,10+y,p[2]);r.dot(x+3,10+y,p[2]);}if(i===4)r.rect(x+1,9+y,3,1,P.paper);}
    }
  }
  if(slot==='charm'){
    if(i===0){r.line(5,2,9,5,P.wood);r.form([[7,5],[11,5],[12,8],[9,8],[8,12],[5,12],[4,9]],creamRamp);r.rect(8,6,2,1,P.ink).rect(5,9,2,2,p[1]);}
    if(i===1){r.line(3,3,8,6,P.wood);r.line(8,6,12,2,P.wood);r.form([[5,6],[11,6],[10,9],[7,14],[6,10]],creamRamp);}
    if(i===2){r.line(9,9,6,14,P.greenDark);[[4,4],[8,4],[4,8],[8,8]].forEach(([x,y])=>{r.oval(x-1,y-1,5,5,P.ink);r.oval(x,y,3,3,P.green);r.dot(x,y,P.greenLight);});r.dot(7,7,P.gold);}
    if(i===3){r.form([[5,3],[10,3],[13,6],[13,10],[10,13],[5,13],[2,10],[2,6]],p);r.oval(5,5,5,6,P.ink).oval(6,6,3,4,P.paper);r.rect(3,7,2,3,P.sand).dot(3,7,P.paper);}
    if(i===4){r.form([[6,2],[10,2],[12,4],[12,7],[9,9],[9,14],[6,14],[6,11],[4,11],[4,9],[7,9],[4,7],[4,4]],creamRamp);r.rect(7,4,3,3,P.ink).rect(8,4,1,2,p[0]);}
  }
  if(slot==='pole'||slot==='broom'){
    r.line(2,13,11,4,P.ink,2);r.line(2,13,11,4,i===1?P.wood:P.steelLight);
    if(i===1){r.dot(4,11,P.sand);r.dot(7,8,P.sand);r.dot(10,5,P.sand);}
    r.rect(1,13,3,2,p[2]);
    if(slot==='pole'){
      if(i===2){r.line(8,2,14,8,P.ink,2);r.line(8,2,14,8,P.gold);[8,10,12].forEach((x,j)=>r.line(x,4+j*2,x-2,6+j*2,P.wood));}
      else if(i===4){r.form([[9,2],[13,2],[15,4],[15,7],[13,7],[13,4],[10,4],[10,7],[8,7],[8,4]],p);}
      else {r.form(i===3?[[10,2],[14,3],[15,6],[12,9],[8,7],[8,4]]:[[10,1],[14,2],[15,5],[12,8],[8,7],[8,4]],p);r.poly([[10,3],[13,3],[13,5],[11,7],[9,6]],P.waterLight);r.dot(10,4,P.paper);r.dot(12,5,P.paper);r.dot(10,6,P.blueDark);}
    }else{
      if(i===1){r.form([[8,2],[11,1],[15,5],[13,8]],creamRamp);r.line(10,3,13,6,p[1]);}
      else {r.form([[8,2],[10,1],[15,6],[14,9],[11,9],[7,5]],i===3?creamRamp:p);r.line(8,5,12,9,P.wood);r.line(10,4,14,8,P.ochre);}
    }
  }
  if(slot==='robot'){
    if(i===3){r.form([[5,4],[11,4],[14,7],[14,11],[11,13],[4,13],[1,10],[2,6]],p);r.oval(5,7,5,3,P.ink);r.rect(4,4,2,2,P.paper).rect(11,8,2,2,P.paper);}
    else if(i===1){r.form([[2,7],[11,5],[15,8],[14,11],[5,13],[1,10]],p);r.rect(6,6,5,4,P.ink).rect(7,6,3,2,P.sand);r.line(2,9,12,7,P.paper);r.rect(5,12,2,2,P.ink).rect(12,10,2,2,P.ink);}
    else {
      r.rect(2,9,3,5,P.ink).rect(11,9,3,5,P.ink);
      r.form([[5,4],[10,4],[13,7],[13,11],[3,11],[2,8]],p);
      r.rect(6,3,4,2,P.ink).rect(6,3,3,1,P.steelLight);
      r.rect(4,7,7,3,P.ink).rect(5,7,5,1,P.waterLight);
      if(i===2){r.line(5,4,4,1,P.ink);r.line(4,1,10,1,P.ink);r.rect(4,11,8,1,P.sand);}
      if(i===4){r.line(11,4,12,1,P.ink);r.dot(12,1,P.red);r.dot(7,8,P.red);}
      if(i===0)r.rect(4,10,8,1,P.paper);
    }
  }
  // Rarity is a clasp/rivet, never a replacement for the set's material colours.
  const tier=RARITIES.find(x=>x.id===rarity)||RARITIES[0];
  if(tier.rank>1){const x=slot==='pole'||slot==='broom'?4:8,y=slot==='pole'||slot==='broom'?11:8;r.dot(x,y,tier.color);if(tier.rank>=4)r.dot(x,y-1,P.paper);if(tier.rank>=5)r.dot(x-1,y,P.goldLight);if(tier.rank===6)r.dot(x+1,y,P.redLight);}
  return r;
}
export function creature(setId='EC'){
  const s=SETS.find(x=>x.id===setId)||SETS[0],p=s.pal,r=new Raster(24,24);
  if(s.id==='EC'){
    r.form([[17,13],[21,11],[23,13],[23,17],[20,19],[16,18]],p);
    r.form([[5,18],[9,18],[10,22],[4,22],[3,21]],p);r.form([[14,18],[18,18],[20,21],[19,22],[14,22]],p);
    r.form([[7,5],[9,3],[14,3],[15,1],[18,2],[18,5],[15,7],[18,10],[19,16],[16,20],[8,20],[4,17],[3,12],[5,8]],p);
    r.poly([[7,13],[14,12],[16,15],[15,18],[8,19],[6,16]],P.paper);
    r.rect(4,13,3,4,p[1]).rect(16,14,3,3,p[2]);eyes(r,7,9,6);r.rect(10,13,3,1,P.ink).dot(11,14,P.ink);
    r.form([[10,17],[13,16],[15,18],[13,20],[10,19]],creamRamp);r.dot(12,18,P.gold);
  }
  if(s.id==='AG'){
    r.form([[15,14],[20,12],[19,8],[22,4],[23,10],[22,16],[18,20],[14,19]],p);
    r.line(20,9,21,13,P.paper);
    r.form([[5,16],[9,17],[9,21],[3,21],[2,20]],p);r.form([[12,17],[17,17],[19,21],[13,22]],p);
    r.form([[6,5],[11,5],[14,8],[16,11],[16,17],[13,20],[7,19],[4,15],[3,10]],p);
    r.form([[6,6],[5,3],[9,4],[12,1],[13,5]],p);
    r.poly([[6,12],[10,11],[12,14],[11,18],[7,17]],P.sand);
    eyes(r,4,8,6);r.rect(5,13,4,1,p[2]).rect(13,14,3,2,p[2]);
  }
  if(s.id==='EP'){
    r.form([[7,18],[10,18],[10,23],[5,23],[5,21]],p);r.form([[14,18],[17,18],[19,22],[14,23]],p);
    r.form([[10,4],[9,1],[12,3],[15,1],[15,4],[18,3],[16,7]], [P.greenLight,P.green,P.greenDark]);
    r.form([[8,5],[15,5],[19,10],[19,16],[15,21],[8,21],[4,16],[4,10]],p);
    [[8,8],[13,8],[6,12],[11,12],[16,12],[8,17],[13,17]].forEach(([x,y])=>{r.line(x,y,x+2,y+1,p[2]);r.dot(x,y-1,P.sand);});
    r.rect(7,10,10,5,P.sand);eyes(r,8,10,5);r.rect(11,14,3,1,P.wood);
    r.form([[3,13],[5,14],[5,18],[2,17]],p);
  }
  if(s.id==='EPP'){
    r.form([[5,17],[9,18],[8,22],[3,22],[3,20]],p);r.form([[14,17],[18,17],[21,21],[18,22],[14,21]],p);
    r.form([[11,3],[16,2],[20,5],[22,10],[21,15],[17,18],[11,17],[8,12],[8,6]],p);
    r.line(15,5,18,7,P.paper).line(18,7,18,11,p[2]).line(18,11,14,12,p[2]).line(14,12,13,9,p[2]);
    r.form([[4,12],[9,9],[13,12],[14,16],[11,20],[5,19],[2,16]],creamRamp);eyes(r,4,12,5);
    r.form([[3,17],[8,19],[16,18],[20,16],[21,18],[18,21],[7,22],[2,20]],p);r.rect(5,19,3,2,P.paper).rect(16,18,3,2,P.paper);
  }
  if(s.id==='GP'){
    r.form([[3,16],[7,14],[9,17],[8,21],[2,22],[1,20]],p);r.form([[16,15],[21,16],[23,20],[22,22],[16,21]],p);
    r.form([[6,5],[10,5],[12,8],[15,5],[19,5],[21,9],[20,15],[17,20],[7,20],[3,16],[3,10]],p);
    r.form([[11,6],[10,2],[12,1],[14,2],[13,4],[16,3],[16,5],[13,7]],p);
    r.oval(6,12,12,7,P.sand);eyes(r,6,8,9);r.line(8,14,16,14,p[2]);r.rect(7,17,2,4,p[1]).rect(15,17,2,4,p[2]);r.dot(4,15,p[0]);
  }
  return r;
}
export function monster(id='algue'){
  const m=MONSTERS.find(x=>x.id===id)||MONSTERS[0],p=m.pal,r=new Raster(28,24);
  if(id==='algue'){
    r.form([[3,10],[5,12],[5,15],[8,15],[8,18],[4,18],[1,15],[1,12]],p);
    r.form([[21,15],[23,12],[23,10],[27,12],[27,16],[24,18],[21,18]],p);
    [[7,19],[18,19]].forEach(([x,y])=>r.form([[x,y],[x+4,y],[x+5,y+3],[x-1,y+3]],p));
    r.form([[7,11],[7,6],[10,7],[11,2],[14,6],[17,3],[17,8],[21,6],[21,12],[23,16],[20,21],[9,21],[5,18],[5,14]],p);
    r.poly([[10,7],[12,6],[12,12],[10,13]],p[0]);r.poly([[17,9],[19,8],[18,14],[16,14]],p[2]);eyes(r,9,12,7,true);
    r.rect(12,18,6,2,P.ink).dot(13,18,P.paper).dot(16,18,P.paper);
  }
  if(id==='calcaire'){
    r.form([[12,6],[15,2],[21,3],[25,7],[26,13],[23,18],[13,19],[9,15],[9,10]],p);
    r.poly([[15,5],[21,5],[23,8],[23,13],[20,15],[15,14],[13,11],[14,8],[18,7],[20,9],[20,11],[17,12]],p[2]);
    r.line(15,5,21,5,P.paper).line(17,9,20,9,P.paper);
    r.form([[4,14],[7,12],[11,14],[14,18],[24,18],[26,21],[23,23],[4,23],[1,20],[2,17]],creamRamp);
    r.rect(4,9,2,7,P.ink).rect(9,10,2,6,P.ink).rect(3,8,3,3,P.paper).rect(8,9,3,3,P.paper).dot(4,9,P.ink).dot(9,10,P.ink);
    r.rect(4,18,4,1,P.wood).line(12,21,22,21,P.ochre);
  }
  if(id==='filtre'){
    r.form([[6,17],[10,17],[10,21],[7,23],[3,23],[3,20],[6,20]],metalRamp);
    r.form([[18,17],[22,17],[23,20],[25,20],[25,23],[19,23],[18,21]],metalRamp);
    r.form([[3,10],[7,10],[7,13],[4,13],[4,17],[1,17],[1,13]],metalRamp);
    r.form([[21,11],[25,11],[27,14],[27,18],[24,18],[24,14],[21,14]],metalRamp);
    r.form([[8,4],[20,4],[22,7],[22,18],[19,21],[9,21],[6,18],[6,7]],p);
    r.rect(8,5,12,2,p[2]).rect(8,17,12,2,p[2]).rect(10,2,8,3,P.ink).rect(11,2,6,1,P.red);
    r.oval(8,7,12,11,P.ink).oval(9,8,10,9,P.paper).oval(10,9,8,7,P.sand);
    r.line(14,12,17,10,P.red).dot(14,12,P.ink).rect(11,15,6,1,P.ink);
    r.dot(10,10,P.wood);r.dot(17,13,P.wood);r.dot(9,19,P.steelLight);
  }
  return r;
}
export function tile(kind='sand',setId='EC',phase=0){
  const s=SETS.find(x=>x.id===setId)||SETS[0],r=new Raster(16,16);
  if(kind==='sand'){r.rect(0,0,16,16,P.sand);[[2,5],[12,3],[7,12]].forEach(([x,y],i)=>{r.rect(x,y,2,1,i%2?P.ochre:P.paper);});}
  if(kind==='paving'){r.rect(0,0,16,16,P.sand).rect(0,15,16,1,P.ochre).rect(15,0,1,16,P.ochre);r.rect(0,0,15,1,P.stoneLight).dot(2,12,P.ochre);}
  if(kind==='grass'){r.rect(0,0,16,16,P.greenLight);[[2,3],[11,1],[7,10],[13,13]].forEach(([x,y])=>r.line(x,y,x+1,y+2,P.green).dot(x+2,y+1,P.greenDark));}
  if(kind==='water'){r.rect(0,0,16,16,P.water).rect(0,15,16,1,P.waterDark);[[2,4],[10,11]].forEach(([x,y])=>{const xx=(x+phase*2)%12;r.rect(xx,y,4,1,P.waterLight).dot(xx+4,y-1,P.waterLight);});}
  if(kind==='hedge'){r.rect(0,0,16,16,P.greenDark);r.form([[1,4],[4,1],[9,2],[13,1],[16,4],[16,13],[11,15],[5,14],[0,15],[0,8]],[P.greenLight,P.green,P.greenDark]);r.rect(3,4,3,1,P.greenLight).rect(11,7,2,1,P.greenLight);}
  if(kind==='deck'){r.rect(0,0,16,16,P.wood);[0,4,8,12].forEach(y=>r.rect(0,y,16,3,P.ochre).rect(0,y,16,1,P.sand));r.dot(2,1,P.wood);r.dot(13,9,P.wood);}
  if(kind==='roof'){r.rect(0,0,16,16,s.pal[2]);[0,4,8,12].forEach(y=>{r.rect(0,y,16,2,s.pal[1]);for(let x=(y%8?0:4);x<16;x+=8)r.rect(x,y,6,1,s.pal[0]);});}
  return r;
}
export const TILE_KINDS=['sand','paving','grass','water','hedge','deck','roof'];
function pine(r,x,y){
  r.rect(x+9,y+19,4,12,P.wood).rect(x+9,y+20,1,10,P.ochre);
  r.form([[x+10,y],[x+13,y+5],[x+16,y+7],[x+15,y+10],[x+19,y+13],[x+18,y+17],[x+22,y+21],[x+17,y+23],[x+5,y+23],[x,y+20],[x+4,y+16],[x+2,y+13],[x+6,y+9],[x+5,y+6]], [P.greenLight,P.green,P.greenDark]);
  r.line(x+5,y+15,x+10,y+16,P.greenDark).line(x+11,y+9,x+15,y+10,P.greenDark);
}
export function stage(setId='EC',mode='courtyard',phase=0){
  const s=SETS.find(x=>x.id===setId)||SETS[0],r=new Raster(128,96);
  for(let y=0;y<96;y+=16)for(let x=0;x<128;x+=16)r.blit(tile(y<16||x<16||x>=112?'grass':y>=64?'sand':'paving',setId,phase),x,y);
  for(let x=0;x<128;x+=16)r.blit(tile('hedge'),x,0);
  // Whitewashed local, with a shallow front face and a scalloped roof.
  r.rect(18,16,29,26,P.ink).rect(19,17,27,24,P.stone).rect(19,17,27,2,P.paper);
  r.rect(23,26,11,16,P.ink).rect(24,27,9,14,P.wood).rect(25,28,1,12,P.ochre).dot(31,34,P.goldLight);
  r.rect(37,24,6,7,P.ink).rect(38,25,4,5,P.waterLight).rect(40,25,1,5,P.paper);
  for(let x=16;x<48;x+=16)r.blit(tile('roof',setId),x,8);
  r.rect(16,23,32,2,P.ink).rect(18,23,28,1,s.pal[0]);
  // Basin: dark inset rim, one consistent water plane and a narrow depth edge.
  r.rect(54,25,48,33,P.ink).rect(55,26,46,30,P.stone).rect(56,27,44,28,P.paper);
  for(let y=28;y<53;y++)for(let x=58;x<98;x++)r.dot(x,y,P.water);
  r.rect(58,28,40,2,P.waterLight).rect(58,51,40,3,P.waterDark);
  [[60,35],[82,33],[70,43],[89,48]].forEach(([x,y])=>r.rect(x+phase,y,6,1,P.waterLight).dot(x+phase+6,y-1,P.waterLight));
  r.rect(56,56,44,2,P.ochre).rect(60,53,8,2,P.ink).rect(61,53,6,1,P.steelLight);
  r.rect(90,46,2,12,P.ink).rect(97,46,2,12,P.ink).rect(90,46,1,11,P.paper).rect(97,46,1,11,P.paper).rect(91,49,6,1,P.paper).rect(91,53,6,1,P.paper);
  // Distinctly coastal props: terracotta, reed tuft, striped lounger and coil.
  r.form([[18,46],[27,46],[25,53],[20,53]], [P.goldLight,P.wood,P.hair]);r.form([[20,44],[18,40],[22,42],[23,36],[25,42],[28,40],[26,45]],[P.greenLight,P.green,P.greenDark]);
  r.rect(103,33,8,21,P.ink).rect(104,34,6,18,P.paper).rect(106,34,2,18,s.pal[1]).rect(104,40,6,1,P.ochre).rect(103,54,1,3,P.ink).rect(110,54,1,3,P.ink);
  r.oval(23,60,13,7,P.greenDark).oval(25,61,9,5,P.green).oval(27,62,5,3,P.sand).line(33,63,40,67,P.greenDark);
  r.form([[96,70],[105,70],[105,78],[95,78]],creamRamp).rect(95,71,10,1,P.wood).rect(99,72,2,4,s.pal[1]);
  pine(r,0,26);pine(r,110,4);
  if(mode==='encounter'){
    r.oval(32,77,20,5,P.ochre).oval(73,47,23,5,P.waterDark);
    r.blit(monster('algue'),70,26);r.blit(trainer(setId),28,48);
  }
  if(mode==='tactical'){
    // Visual grid study only. It deliberately does not imply walkability rules.
    for(let x=0;x<128;x+=16)for(let y=0;y<96;y+=16){r.dot(x,y,P.stoneDark);r.dot(x+1,y,P.stoneDark);r.dot(x,y+1,P.stoneDark);}
    [[2,4],[3,4],[4,4],[2,3]].forEach(([x,y])=>{r.rect(x*16+1,y*16+14,14,1,P.teal);r.rect(x*16+1,y*16+1,1,13,P.teal);r.rect(x*16+14,y*16+1,1,13,P.teal);});
    r.oval(34,77,16,3,P.ochre).oval(82,62,24,4,P.ochre);
    r.blit(monster('filtre'),78,42);r.blit(trainer(setId),28,48);
  }
  return r;
}
export function isometricStudy(setId='EC'){
  const s=SETS.find(x=>x.id===setId)||SETS[0],r=new Raster(128,96);r.rect(0,0,128,96,P.cream);
  // 2:1 diamonds on a 6×6 board. A view study, not a playable map.
  for(let y=0;y<6;y++)for(let x=0;x<6;x++){
    const px=64+(x-y)*8,py=18+(x+y)*4;
    if(x===5)r.poly([[px,py+4],[px+8,py],[px+8,py+6],[px,py+10]],P.ochre);
    if(y===5)r.poly([[px-8,py],[px,py+4],[px,py+10],[px-8,py+6]],P.wood);
    r.poly([[px,py-4],[px+8,py],[px,py+4],[px-8,py]],(x+y)%2?P.sand:P.stoneLight);
    r.line(px-8,py,px,py+4,P.ochre);r.line(px,py+4,px+8,py,P.ochre);
    if(x>=3&&y<=1)r.poly([[px,py-3],[px+6,py],[px,py+3],[px-6,py]],P.water);
  }
  r.blit(trainer(setId),34,21).blit(monster('calcaire'),66,26);
  r.rect(13,83,102,1,s.pal[1]);return r;
}
export function atlas(kind){
  if(kind==='trainers'){const r=new Raster(120,96);SETS.forEach((s,x)=>[0,1,2].forEach(y=>r.blit(trainer(s.id,y),x*24,y*32)));return r;}
  if(kind==='creatures'){const r=new Raster(120,24);SETS.forEach((s,x)=>r.blit(creature(s.id),x*24,0));return r;}
  if(kind==='monsters'){const r=new Raster(84,24);MONSTERS.forEach((m,x)=>r.blit(monster(m.id),x*28,0));return r;}
  if(kind==='equipment'){const r=new Raster(128,80);SETS.forEach((s,y)=>SLOT_IDS.forEach((slot,x)=>r.blit(icon(s.id,slot),x*16,y*16)));return r;}
  if(kind==='tiles'){const r=new Raster(112,16);TILE_KINDS.forEach((k,x)=>r.blit(tile(k),x*16,0));return r;}
  throw new Error('Unknown atlas '+kind);
}
export function inventoryEntries(){
  const out=[];
  for(const s of SETS){
    for(let frame=0;frame<3;frame++)out.push({id:`trainer-${s.id.toLowerCase()}-${frame}`,category:'trainer',set:s.id,frame,anchor:[12,31],raster:trainer(s.id,frame)});
    out.push({id:`creature-${s.id.toLowerCase()}`,category:'creature',set:s.id,name:s.creature,anchor:[12,23],raster:creature(s.id)});
    for(const slot of SLOT_IDS)for(const rar of RARITIES)out.push({id:`item-${s.id.toLowerCase()}-${slot}-${rar.id}`,category:'item',set:s.id,slot,rarity:rar.id,raster:icon(s.id,slot,rar.id)});
    for(const mode of ['courtyard','encounter','tactical'])out.push({id:`stage-${s.id.toLowerCase()}-${mode}`,category:'stage',set:s.id,mode,raster:stage(s.id,mode)});
  }
  for(const m of MONSTERS)out.push({id:`monster-${m.id}`,category:'monster',name:m.name,anchor:[14,23],raster:monster(m.id)});
  for(const k of TILE_KINDS)out.push({id:`tile-${k}`,category:'tile',raster:tile(k)});
  for(const kind of ['trainers','creatures','monsters','equipment','tiles'])out.push({id:`atlas-${kind}`,category:'atlas',raster:atlas(kind)});
  out.push({id:'stage-isometric-study',category:'study',raster:isometricStudy()});
  return out;
}
