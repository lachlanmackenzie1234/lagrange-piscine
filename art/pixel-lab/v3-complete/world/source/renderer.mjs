import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {Canvas} from './raster.mjs';
import {THEMES,hash,TILE,WIDTH,HEIGHT} from './generator.mjs';
const context={window:{},document:{createElement:name=>{if(name!=='canvas')throw Error('Only native canvases are supported');return new Canvas();}}};
vm.runInNewContext(readFileSync(new URL('./pixelart.js',import.meta.url),'utf8'),context);
const PA=context.window.PixelArt;
// Map-specific palette for the current code-native tile shapes; set identity stays in the roofs and shutters.
Object.assign(PA.C,{i:'#293849',w:'#f5f2dc',c:'#ede7cf',s:'#ead796',S:'#c9b780',z:'#f2dfa8',u:'#bbc3ba',U:'#96a29d',b:'#426b9e',B:'#2d4d71',l:'#85b9d7',g:'#4b966e',G:'#2e6454',L:'#8acaab',q:'#518fcb',Q:'#376bad',o:'#886447',O:'#bd9863',j:'#b97858',J:'#845842',x:'#d3a5bb',y:'#dfc16d'});
const C=PA.C;
const WATER={calme:['#518fcb','#78b0e0','#376bad'],'traité':['#49a7b7','#8dd5d4','#2d7f99'],sauvage:['#71934e','#a5b574','#4b713f'],critique:['#46684b','#70965d','#304c42']};
const variants=new Map();
function waterTile(v=0,state='calme'){
  const k=`water-${v}-${state}`;if(variants.has(k))return variants.get(k);
  const p=WATER[state]||WATER.calme,c=new Canvas(16,16);c.rect(0,0,16,16,p[0]);
  for(let x=0;x<16;x++){const y=(Math.floor(x/3)+v*3)%16;c.dot(x,y,p[1]);c.dot(x,(y+1)%16,p[1]);c.dot(x,(y+8)%16,p[2]);}
  variants.set(k,c);return c;
}
export function getTile(name,variant=0,state='calme'){return name==='water'?waterTile(variant%3,state):PA.tile(name,variant);}
function frame(c,x,y,w,h,fill,edge=C.i){c.rect(x,y,w,h,edge).rect(x+1,y+1,w-2,h-2,fill);}
function fence(c,x,y){c.rect(x,y+7,16,2,C.o).rect(x,y+7,16,1,C.O);for(const dx of[2,12])c.rect(x+dx,y+3,2,11,C.o).dot(x+dx,y+3,C.z);}
function house(c,obj,theme){
  const x=obj.x*TILE,y=obj.y*TILE,w=obj.w*TILE,h=obj.h*TILE;
  frame(c,x+1,y+21,w-2,h-21,C.c);c.rect(x+2,y+h-4,w-4,3,'#d0c6aa');
  // Roof is a broad overhead plane; the south wall is deliberately shallow.
  frame(c,x,y+2,w,27,theme.roofDark);c.rect(x+2,y+2,w-4,2,theme.roofLight).rect(x+2,y+5,w-4,20,theme.roof);
  for(let px=x+6;px<x+w-3;px+=6)c.rect(px,y+5,1,20,theme.roofLight).rect(px+1,y+5,1,20,theme.roofDark);
  c.rect(x+1,y+26,w-2,2,theme.roofLight).rect(x,y+28,w,2,theme.roofDark);
  frame(c,x+18,y+h-16,12,16,theme.accent);c.rect(x+20,y+h-13,8,5,C.l).dot(x+27,y+h-6,C.z);
  frame(c,x+42,y+h-14,13,9,C.l);c.rect(x+43,y+h-13,11,2,C.w).rect(x+48,y+h-13,1,6,C.i);
  c.rect(x+40,y+h-14,2,9,theme.accent).rect(x+55,y+h-14,2,9,theme.accent);
  c.rect(x+16,y+h-1,16,1,C.S);
}
function shed(c,o,theme){
  const x=o.x*TILE,y=o.y*TILE;
  frame(c,x,y+9,32,23,theme.accent);for(let sy=y+13;sy<y+31;sy+=4)c.rect(x+1,sy,30,1,theme.roofDark);
  frame(c,x,y+1,32,10,theme.roofDark);c.rect(x+1,y+2,30,1,theme.roofLight);
  frame(c,x+2,y+17,12,15,C.o);c.rect(x+3,y+18,10,2,C.O).dot(x+11,y+25,C.z);
  frame(c,x+18,y+15,10,10,C.g);c.rect(x+20,y+17,6,6,theme.accent).rect(x+21,y+17,3,1,C.L);
}
function pump(c,o){
  const x=o.x*TILE+2,y=o.y*TILE+3;frame(c,x,y,12,12,'#96a3ad');frame(c,x+3,y+2,7,6,C.w);c.line(x+6,y+5,x+8,y+3,C.r);c.rect(x+2,y+9,8,1,C.N);
  if(o.salt)c.rect(x,y-2,5,3,C.w).dot(x+2,y-1,C.t);
}
function prop(c,o,theme){
  const x=o.x*TILE,y=o.y*TILE,g=c.getContext('2d');
  if(o.kind==='villa')house(c,o,theme);
  else if(o.kind==='shed')shed(c,o,theme);
  else if(o.kind==='pump')pump(c,o);
  else if(o.kind==='pine')g.drawImage(PA.pine(),x,y);
  else if(o.kind==='tree')PA.rows(g,PA.TREE,x,y);
  else if(o.kind==='lounger')PA.rows(g,PA.LOUNGER,x,y);
  else if(o.kind==='pot'){frame(c,x+4,y+8,8,6,C.j);c.rect(x+3,y+7,10,2,C.J).rect(x+6,y+12,4,2,C.J);c.rect(x+6,y+3,4,5,C.g).rect(x+4,y+4,3,3,C.G).rect(x+9,y+2,3,4,C.g).dot(x+7,y+3,C.L);}
  else if(o.kind==='sign'){frame(c,x+2,y+2,12,9,C.o);c.rect(x+3,y+3,10,6,C.z).rect(x+6,y+11,2,4,C.o).rect(x+4,y+5,6,1,theme.accent);}
  else if(o.kind==='bench'){c.rect(x+1,y+4,14,7,C.o).rect(x+1,y+4,14,2,C.O).rect(x+1,y+8,14,1,C.O).rect(x+3,y+11,2,3,C.i).rect(x+11,y+11,2,3,C.i);}
}
export function renderMap(map,{state='calme',dirt=0,markers=false}={}){
  const c=new Canvas(WIDTH*TILE,HEIGHT*TILE),theme=THEMES[map.residence],ctx=c.getContext('2d');
  for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++)ctx.drawImage(getTile(map.ground[y][x],hash(`${map.terrainSeed}|${x}|${y}`)%3,state),x*TILE,y*TILE);
  // Pixel edges soften the path boundary without changing the collision grid.
  for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++)if(map.ground[y][x]==='sand'){
    if(map.ground[y-1]?.[x]==='grass')c.rect(x*TILE,y*TILE,TILE,1,C.z);
    if(map.ground[y+1]?.[x]==='grass')c.rect(x*TILE,y*TILE+15,TILE,1,C.S);
  }
  for(let x=0;x<WIDTH;x++){
    if(theme.edge==='fence')fence(c,x*TILE,0);else ctx.drawImage(PA.tile('hedge'),x*TILE,0);
    if(x!==map.anchors.entrance.x)fence(c,x*TILE,(HEIGHT-1)*TILE);
  }
  for(let y=1;y<HEIGHT-1;y+=2){ctx.drawImage(PA.pine(),0,y*TILE);if(theme.edge!=='canal')ctx.drawImage(PA.pine(),(WIDTH-1)*TILE,y*TILE);}
  if(theme.edge==='canal')for(let y=0;y<HEIGHT;y++){ctx.drawImage(waterTile(y%3),15*TILE,y*TILE);c.rect(15*TILE,y*TILE,3,16,C.o).rect(15*TILE,y*TILE,1,16,C.z);}
  const p=map.pool,x=p.x*TILE,y=p.y*TILE,w=p.w*TILE,h=p.h*TILE,water=WATER[state]||WATER.calme;
  c.rect(x,y,w,3,C.w).rect(x,y+h-3,w,3,C.c).rect(x,y,3,h,C.c).rect(x+w-3,y,3,h,C.w);
  c.rect(x+3,y+3,w-6,1,C.i).rect(x+3,y+h-6,w-6,3,water[2]).rect(x+3,y+4,1,h-10,water[2]);
  for(let i=0;i<Math.min(24,dirt*6);i++){const r=hash(`${map.seed}|dirt|${i}`);c.rect(x+7+r%(w-16),y+7+(r>>>12)%(h-16),2,1,i%2?C.o:C.O);}
  const l=map.anchors.ladder,lx=l.x*TILE+4,ly=l.y*TILE-10;
  c.rect(lx,ly,2,15,C.i).rect(lx+8,ly,2,15,C.i).rect(lx,ly,1,14,C.w).rect(lx+8,ly,1,14,C.w);for(const off of [4,9])c.rect(lx+1,ly+off,8,1,C.w);
  const s=map.anchors.skimmer;frame(c,s.x*TILE+3,s.y*TILE-3,10,5,C.c);c.rect(s.x*TILE+5,s.y*TILE-1,6,1,C.i);
  for(const o of [...map.objects].sort((a,b)=>(a.y+a.h)-(b.y+b.h)||a.x-b.x))prop(c,o,theme);
  if(markers){for(const [name,a]of Object.entries(map.anchors)){const col=name==='encounter'?C.r:C.b;c.rect(a.x*TILE+5,a.y*TILE+5,6,6,col).rect(a.x*TILE+7,a.y*TILE+7,2,2,C.w);}}
  return c;
}
export const palette=()=>({...C,...Object.fromEntries(Object.entries(THEMES).flatMap(([key,t])=>[['roof',t.roof],['roofLight',t.roofLight],['roofDark',t.roofDark],['accent',t.accent]].map(([name,value])=>[`${key}_${name}`,value])))});
