// Rebuild every native PNG with only Node's standard library.
import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {deflateSync,inflateSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {join,dirname} from 'node:path';
import {P,SETS,SLOTS,SLOT_IDS,RARITIES,MONSTERS,inventoryEntries} from './assets.mjs';
const root=dirname(fileURLToPath(import.meta.url)),dest=join(root,'exports');
mkdirSync(dest,{recursive:true});
const table=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc(bytes){let n=0xffffffff;for(const v of bytes)n=table[(n^v)&255]^(n>>>8);return (n^0xffffffff)>>>0;}
function chunk(type,data){const t=Buffer.from(type),len=Buffer.alloc(4),sum=Buffer.alloc(4);len.writeUInt32BE(data.length);sum.writeUInt32BE(crc(Buffer.concat([t,data])));return Buffer.concat([len,t,data,sum]);}
function png(r){
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(r.width);ihdr.writeUInt32BE(r.height,4);ihdr[8]=8;ihdr[9]=6;
  const stride=r.width*4,raw=Buffer.alloc((stride+1)*r.height);
  for(let y=0;y<r.height;y++){raw[y*(stride+1)]=0;Buffer.from(r.data.slice(y*stride,(y+1)*stride)).copy(raw,y*(stride+1)+1);}
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
const entries=inventoryEntries(),allowed=new Set(Object.values(P).map(c=>c.toLowerCase())),checks=[];
const expected={trainer:[24,32],creature:[24,24],monster:[28,24],item:[16,16],tile:[16,16],stage:[128,96],study:[128,96]};
const manifest={version:1,direction:'Lacanau field kit',status:'visual-trials',generatedFrom:'../assets.mjs',palette:'palette.json',sampling:'nearest-neighbour',alpha:'binary, straight RGBA',coordinates:'top-left origin; anchors are native pixel coordinates',sets:SETS,rarities:RARITIES,slots:SLOT_IDS.map((id,i)=>({id,gameSlot:SLOTS[i]})),monsters:MONSTERS,atlases:{trainers:{cell:[24,32],columns:SETS.map(s=>s.id),rows:['idle','step-left','step-right']},creatures:{cell:[24,24],columns:SETS.map(s=>s.id)},monsters:{cell:[28,24],columns:MONSTERS.map(m=>m.id)},equipment:{cell:[16,16],columns:SLOT_IDS,rows:SETS.map(s=>s.id),rarity:'common'},tiles:{cell:[16,16],columns:['sand','paving','grass','water','hedge','deck','roof']}},assets:[]};
for(const e of entries){
  const {raster:r,...meta}=e,folder=join(dest,e.category);mkdirSync(folder,{recursive:true});
  const file=`${e.category}/${e.id}.png`;writeFileSync(join(dest,file),png(r));
  const colors=new Set();let opaque=0,partial=0;
  for(let i=0;i<r.data.length;i+=4){const a=r.data[i+3];if(a&&a!==255)partial++;if(a){opaque++;colors.add('#'+[...r.data.slice(i,i+3)].map(n=>n.toString(16).padStart(2,'0')).join(''));}}
  const invalidColors=[...colors].filter(c=>!allowed.has(c)),size=expected[e.category];
  // Read our PNG back independently of the raster dimensions and compare decoded bytes.
  const bytes=readFileSync(join(dest,file));let offset=8,idat=[];
  while(offset<bytes.length){const len=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8),data=bytes.subarray(offset+8,offset+8+len);if(bytes.readUInt32BE(offset+8+len)!==crc(bytes.subarray(offset+4,offset+8+len)))throw Error('CRC mismatch: '+file);if(type==='IDAT')idat.push(data);offset+=12+len;}
  const raw=inflateSync(Buffer.concat(idat));let roundTrip=true;
  for(let y=0;y<r.height;y++)if(!Buffer.from(r.data.slice(y*r.width*4,(y+1)*r.width*4)).equals(raw.subarray(y*(r.width*4+1)+1,(y+1)*(r.width*4+1))))roundTrip=false;
  const passed=(!size||(size[0]===bytes.readUInt32BE(16)&&size[1]===bytes.readUInt32BE(20)))&&partial===0&&opaque>0&&invalidColors.length===0&&roundTrip;
  checks.push({id:e.id,width:r.width,height:r.height,colors:colors.size,opaquePixels:opaque,partialAlpha:partial,invalidColors,roundTrip,passed});
  if(!passed)throw Error('Asset validation failed: '+e.id);
  manifest.assets.push({...meta,file,width:r.width,height:r.height});
}
writeFileSync(join(dest,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
writeFileSync(join(dest,'palette.json'),JSON.stringify(P,null,2)+'\n');
const paletteText=['GIMP Palette','Name: Lagrange Quest - existing palette','Columns: 8','#',...Object.entries(P).map(([name,c])=>{const v=parseInt(c.slice(1),16);return `${String(v>>16&255).padStart(3)} ${String(v>>8&255).padStart(3)} ${String(v&255).padStart(3)}\t${name}`;})].join('\n');
writeFileSync(join(dest,'palette.gpl'),paletteText+'\n');
mkdirSync(join(root,'qa'),{recursive:true});
const counts={};for(const e of entries)counts[e.category]=(counts[e.category]||0)+1;
writeFileSync(join(root,'qa/native-checks.json'),JSON.stringify({passed:true,count:entries.length,counts,checks},null,2)+'\n');
console.log(JSON.stringify({exported:entries.length,counts,dimensions:'pass',palette:'pass',binaryAlpha:'pass',pngRoundTrip:'pass',folder:dest},null,2));
