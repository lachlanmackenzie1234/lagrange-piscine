/* Stable, versioned pool layouts. No renderer, browser, clock or live pool state. */
export const VERSION='pocket-coast-map-v1';
export const WIDTH=16, HEIGHT=12, TILE=16;
export const THEMES={
  EC:{name:'Pine courtyard',roof:'#537daf',roofLight:'#85b5d0',roofDark:'#365271',accent:'#426b9e',ground:'grass',deck:'slab',edge:'hedge',trees:8},
  AG:{name:'Dune garden',roof:'#789e9d',roofLight:'#a5c5ba',roofDark:'#486e73',accent:'#2f8266',ground:'grass',deck:'deck',edge:'canal',trees:4},
  EP:{name:'Golfside lawn',roof:'#bb8058',roofLight:'#dfa96c',roofDark:'#815346',accent:'#bf9d47',ground:'grass',deck:'slab',edge:'fence',trees:5},
  EPP:{name:'Holiday court',roof:'#8d7aa0',roofLight:'#baabc8',roofDark:'#625870',accent:'#937aac',ground:'grass',deck:'paving',edge:'hedge',trees:4},
  GP:{name:'Shaded green',roof:'#4f928b',roofLight:'#82b6a5',roofDark:'#365d60',accent:'#468982',ground:'grass',deck:'deck',edge:'forest',trees:10},
};
export function hash(value){let n=2166136261;for(const ch of String(value)){n^=ch.charCodeAt(0);n=Math.imul(n,16777619);}return n>>>0;}
function random(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const key=p=>`${p.x},${p.y}`;
const inside=p=>p.x>=0&&p.x<WIDTH&&p.y>=0&&p.y<HEIGHT;
const rectCells=r=>Array.from({length:r.w*r.h},(_,i)=>({x:r.x+i%r.w,y:r.y+Math.floor(i/r.w)}));
const inflate=(r,n)=>({x:r.x-n,y:r.y-n,w:r.w+n*2,h:r.h+n*2});
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const inRect=(p,r)=>p.x>=r.x&&p.x<r.x+r.w&&p.y>=r.y&&p.y<r.y+r.h;
const rectInside=r=>r.x>=1&&r.y>=1&&r.x+r.w<=WIDTH-1&&r.y+r.h<=HEIGHT-1;
const neighbours=p=>[{x:p.x,y:p.y-1},{x:p.x+1,y:p.y},{x:p.x,y:p.y+1},{x:p.x-1,y:p.y}];
const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
function setRect(grid,rect,value){for(const p of rectCells(rect))grid[p.y][p.x]=value;}
function shuffle(items,r){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function flood(collision,start){
  const seen=new Set();if(!inside(start)||collision[start.y][start.x])return seen;
  const queue=[start];seen.add(key(start));
  for(let i=0;i<queue.length;i++)for(const n of neighbours(queue[i]))if(inside(n)&&!collision[n.y][n.x]&&!seen.has(key(n))){seen.add(key(n));queue.push(n);}
  return seen;
}
function route(collision,start,end){
  const queue=[start],parent=new Map([[key(start),null]]);
  for(let i=0;i<queue.length;i++){
    const p=queue[i];if(key(p)===key(end)){const path=[];let at=p;while(at){path.unshift(at);at=parent.get(key(at));}return path;}
    for(const n of neighbours(p))if(inside(n)&&!collision[n.y][n.x]&&!parent.has(key(n))){parent.set(key(n),p);queue.push(n);}
  }
  return null;
}
function planGeometry(r){
  const pick=(lo,hi)=>lo+Math.floor(r()*(hi-lo+1)),which=pick(0,4);
  let house,pool,shed,gate;
  if(which===0){house={x:pick(1,3),y:1,w:4,h:3};pool={x:pick(7,8),y:4,w:pick(5,6),h:pick(3,4)};shed={x:pick(1,2),y:7,w:2,h:2};gate=pick(5,9);}
  if(which===1){house={x:pick(9,10),y:1,w:4,h:3};pool={x:pick(2,3),y:4,w:pick(5,6),h:pick(3,4)};shed={x:pick(11,12),y:8,w:2,h:2};gate=pick(6,9);}
  if(which===2){house={x:pick(1,3),y:1,w:4,h:3};pool={x:pick(9,10),y:3,w:pick(3,4),h:5};shed={x:pick(2,4),y:8,w:2,h:2};gate=pick(6,8);}
  if(which===3){house={x:pick(6,8),y:1,w:4,h:3};pool={x:pick(3,4),y:6,w:pick(6,7),h:3};shed={x:pick(11,12),y:5,w:2,h:2};gate=pick(1,2);}
  if(which===4){house={x:pick(1,2),y:1,w:4,h:3};pool={x:pick(6,7),y:5,w:pick(5,6),h:3};shed={x:pick(11,12),y:1,w:2,h:2};gate=pick(3,7);}
  const mirrored=r()<.5;
  if(mirrored){for(const rect of [house,pool,shed])rect.x=WIDTH-rect.x-rect.w;gate=WIDTH-1-gate;}
  const deck=inflate(pool,1);
  if(![house,pool,shed,deck].every(rectInside)||overlap(house,deck)||overlap(shed,deck)||overlap(house,shed))return null;
  return {archetype:['side-court','garden-court','long-basin','south-terrace','service-lane'][which],mirrored,house,pool,shed,deck,gate};
}
function build(poolInfo,seed,revision,attempt){
  const r=random(hash(`${seed}|layout|${attempt}`)),decor=random(hash(`${seed}|decor`)),g=planGeometry(r);
  if(!g)return null;
  const collision=Array.from({length:HEIGHT},(_,y)=>Array.from({length:WIDTH},(_,x)=>x===0||y===0||x===WIDTH-1||y===HEIGHT-1?1:0));
  const ground=Array.from({length:HEIGHT},()=>Array(WIDTH).fill('grass'));
  for(const rect of [g.house,g.shed,g.pool])setRect(collision,rect,1);
  const entrance={x:g.gate,y:HEIGHT-1};collision[entrance.y][entrance.x]=0;
  const theme=THEMES[poolInfo.res];
  if(theme.edge==='canal')for(let y=0;y<HEIGHT;y++)ground[y][WIDTH-1]='water';
  setRect(ground,g.deck,theme.deck);setRect(ground,g.pool,'water');
  const anchors={entrance,houseDoor:{x:g.house.x+1,y:g.house.y+g.house.h},shedDoor:{x:g.shed.x,y:g.shed.y+g.shed.h},ladder:{x:g.pool.x+1,y:g.pool.y+g.pool.h},skimmer:{x:g.pool.x+g.pool.w-2,y:g.pool.y+g.pool.h}};
  if(Object.values(anchors).some(p=>!inside(p)||collision[p.y][p.x]))return null;
  const pumpOptions=[{x:g.shed.x+g.shed.w,y:g.shed.y+1,w:1,h:1},{x:g.shed.x-1,y:g.shed.y+1,w:1,h:1}];
  const pump=pumpOptions.find(p=>rectInside(p)&&!collision[p.y][p.x]&&!collision[p.y+1][p.x]&&!Object.values(anchors).some(a=>a.x===p.x&&a.y===p.y));
  if(!pump)return null;
  setRect(collision,pump,1);anchors.pumpAccess={x:pump.x,y:pump.y+1};
  const reserved=new Set(),paths=[];
  for(const [name,target]of Object.entries(anchors)){
    const path=route(collision,entrance,target);if(!path)return null;paths.push({to:name,cells:path});
    for(const cell of path){reserved.add(key(cell));if(ground[cell.y][cell.x]==='grass')ground[cell.y][cell.x]='sand';}
  }
  // Keep a second open lane beside each route where space permits.
  for(const path of paths)for(const cell of path.cells){const n={x:cell.x+1,y:cell.y};if(inside(n)&&n.x<WIDTH-1&&!collision[n.y][n.x]){reserved.add(key(n));if(ground[n.y][n.x]==='grass')ground[n.y][n.x]='sand';}}
  const arenaCandidates=[];
  for(let y=2;y<HEIGHT-3;y++)for(let x=1;x<WIDTH-3;x++){
    const rect={x,y,w:3,h:3};if(rectCells(rect).every(p=>!collision[p.y][p.x])&&!overlap(rect,g.deck))arenaCandidates.push(rect);
  }
  if(!arenaCandidates.length)return null;
  const arena=shuffle(arenaCandidates,r)[0];for(const p of rectCells(arena))reserved.add(key(p));
  anchors.encounter={x:arena.x+1,y:arena.y+1};
  const activeSpawn=paths.find(p=>p.to==='houseDoor').cells.find(p=>p.y<=HEIGHT-3)||{x:entrance.x,y:HEIGHT-2};
  anchors.playerSpawn=activeSpawn;reserved.add(key(activeSpawn));
  if(distance(anchors.playerSpawn,anchors.encounter)<3)return null;
  // A walking graph is checked before and after every solid decoration.
  const fullyConnected=()=>{const reachable=flood(collision,entrance);let count=0;for(const row of collision)for(const v of row)if(!v)count++;return reachable.size===count;};
  if(!fullyConnected())return null;
  const objects=[{kind:'villa',...g.house},{kind:'shed',...g.shed},{kind:'pump',...pump,salt:!!poolInfo.salt}];
  function place(kind,rect){
    if(!rectInside(rect)||rectCells(rect).some(p=>collision[p.y][p.x]||reserved.has(key(p))))return false;
    setRect(collision,rect,1);
    if(!fullyConnected()){setRect(collision,rect,0);return false;}
    objects.push({kind,...rect,variant:Math.floor(decor()*3)});return true;
  }
  const seats=[{x:g.pool.x-1,y:g.pool.y+1,w:1,h:1},{x:g.pool.x+g.pool.w,y:g.pool.y+1,w:1,h:1},{x:g.pool.x+g.pool.w,y:g.pool.y+g.pool.h-1,w:1,h:1}];
  for(const seat of shuffle(seats,decor).slice(0,2))place('lounger',seat);
  const free=[];for(let y=1;y<HEIGHT-1;y++)for(let x=1;x<WIDTH-1;x++)free.push({x,y});
  let planted=0;
  for(const p of shuffle(free,decor)){
    if(planted>=theme.trees)break;
    const tall=decor()<.45,rect={...p,w:1,h:tall?2:1};
    if(rectCells(rect).some(c=>!inside(c)||ground[c.y][c.x]!=='grass'))continue;
    if(place(tall?'pine':'tree',rect))planted++;
  }
  let ornaments=0;
  for(const p of shuffle(free,decor)){if(ornaments>=3)break;if(place(ornaments===0?'sign':decor()<.5?'pot':'bench',{...p,w:1,h:1}))ornaments++;}
  return {
    version:VERSION,id:poolInfo.id,residence:poolInfo.res,label:`${poolInfo.res} ${poolInfo.unit}`,seed,revision,
    fictionalLayout:true,theme:theme.name,border:theme.edge,width:WIDTH,height:HEIGHT,tileSize:TILE,pixelWidth:WIDTH*TILE,pixelHeight:HEIGHT*TILE,
    archetype:g.archetype,mirrored:g.mirrored,pool:g.pool,deck:g.deck,arena,anchors,objects,paths,
    ground,collision,terrainSeed:hash(`${seed}|terrain`),generationAttempt:attempt,
  };
}
export function generateMap(poolInfo,{revision=0}={}){
  if(!poolInfo?.id||!THEMES[poolInfo.res])throw Error('A stable pool id and supported residence are required.');
  if(!Number.isInteger(revision)||revision<0)throw Error('Revision must be a non-negative integer.');
  const seed=hash(`${VERSION}|${poolInfo.id}|${revision}`);
  for(let attempt=0;attempt<256;attempt++){const map=build(poolInfo,seed,revision,attempt);if(map)return map;}
  throw Error(`No connected layout for ${poolInfo.id}, revision ${revision}`);
}
export function validateMap(map){
  const errors=[],inBounds=r=>r.x>=0&&r.y>=0&&r.x+r.w<=WIDTH&&r.y+r.h<=HEIGHT;
  if(map.width!==WIDTH||map.height!==HEIGHT||map.collision.length!==HEIGHT||map.ground.length!==HEIGHT)errors.push('grid dimensions');
  if(map.collision.some(row=>row.length!==WIDTH||row.some(v=>v!==0&&v!==1))||map.ground.some(row=>row.length!==WIDTH))errors.push('grid shape');
  if(errors.length)return {valid:false,errors};
  if(!inBounds(map.pool)||!inBounds(map.deck)||!inBounds(map.arena))errors.push('geometry bounds');
  if(rectCells(map.pool).some(p=>map.collision[p.y]?.[p.x]!==1||map.ground[p.y]?.[p.x]!=='water'))errors.push('water collision');
  if(rectCells(map.arena).some(p=>map.collision[p.y]?.[p.x]!==0))errors.push('arena obstructed');
  for(const object of map.objects){if(!inBounds(object))errors.push('object bounds');if(rectCells(object).some(p=>map.collision[p.y]?.[p.x]!==1))errors.push('object collision');if(overlap(object,map.pool))errors.push('object overlaps water');}
  for(let i=0;i<map.objects.length;i++)for(let j=i+1;j<map.objects.length;j++)if(overlap(map.objects[i],map.objects[j]))errors.push('objects overlap');
  const reached=flood(map.collision,map.anchors.entrance);let walkable=0;
  for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++)if(!map.collision[y][x]){walkable++;if(!reached.has(`${x},${y}`))errors.push('isolated walkable cell');}
  for(const [name,point]of Object.entries(map.anchors))if(!reached.has(key(point)))errors.push(`unreachable ${name}`);
  for(const path of map.paths){if(path.cells.some(p=>map.collision[p.y]?.[p.x]))errors.push('path blocked');for(let i=1;i<path.cells.length;i++)if(distance(path.cells[i-1],path.cells[i])!==1)errors.push('path gap');}
  if(walkable<45)errors.push('too little walkable ground');
  return {valid:errors.length===0,errors:[...new Set(errors)],walkableCells:walkable,reachableCells:reached.size};
}
