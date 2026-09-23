import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {generateMap,validateMap,THEMES,VERSION} from './source/generator.mjs';
import {renderMap,getTile,palette} from './source/renderer.mjs';
import {Canvas,png,text} from './source/raster.mjs';
const root=dirname(fileURLToPath(import.meta.url)),out=join(root,'exports');
for(const path of ['maps','layouts'])mkdirSync(join(out,path),{recursive:true});
const pools=JSON.parse(readFileSync(join(root,'pools.json'),'utf8'));
const maps=pools.map(p=>generateMap(p)),images=maps.map(m=>renderMap(m));
const entries=[],hashes=new Set(),counts={};
for(let i=0;i<maps.length;i++){
  const map=maps[i],check=validateMap(map);if(!check.valid)throw Error(map.id+': '+check.errors.join(', '));
  const bytes=png(images[i]),sha=createHash('sha256').update(bytes).digest('hex');
  if(hashes.has(sha))throw Error('Duplicate visual map '+map.id);hashes.add(sha);
  writeFileSync(join(out,'maps',map.id+'.png'),bytes);
  writeFileSync(join(out,'layouts',map.id+'.json'),JSON.stringify(map,null,2)+'\n');
  counts[map.residence]=(counts[map.residence]||0)+1;
  entries.push({id:map.id,label:map.label,residence:map.residence,seed:map.seed,version:map.version,revision:map.revision,png:`maps/${map.id}.png`,layout:`layouts/${map.id}.json`,sha256:sha,width:images[i].width,height:images[i].height,theme:map.theme,archetype:map.archetype,...check});
}
const cardW=276,cardH=230,columns=4,rows=Math.ceil(maps.length/columns),sheet=new Canvas(cardW*columns+24,rows*cardH+104);
sheet.rect(0,0,sheet.width,sheet.height,'#f5f1e5');
text(sheet,'POCKET COAST / 23 POOL MAPS',20,18,'#293849',3);
text(sheet,'FIXED POOL SEEDS - 5 RESIDENCES - NATIVE 256 X 192 - LAYOUT TRIAL',20,54,'#687874',1);
for(let i=0;i<maps.length;i++){
  const x=20+i%columns*cardW,y=78+Math.floor(i/columns)*cardH,m=maps[i],theme=THEMES[m.residence];
  sheet.rect(x-1,y-1,258,194,'#293849').blit(images[i],x,y);
  sheet.rect(x,y+201,5,14,theme.accent);text(sheet,m.label,x+13,y+201,'#293849',2);
  text(sheet,m.archetype,x+13,y+219,'#687874',1);
}
text(sheet,'23 DISTINCT FICTIONAL LAYOUTS. ENTRANCES, POOL ACCESS AND SERVICE PATHS CONNECTED.',20,sheet.height-18,'#687874',1);
writeFileSync(join(out,'pool-maps-contact-sheet.png'),png(sheet));
const stateMap=maps[0],strip=new Canvas(800,222);strip.rect(0,0,800,222,'#f5f1e5');
for(const [i,state]of ['calme','sauvage','critique'].entries()){
  strip.blit(renderMap(stateMap,{state,dirt:i}),8+i*264,8);text(strip,`${stateMap.label} / ${state}`,8+i*264,208,'#293849',1);
}
writeFileSync(join(out,'fixed-layout-changing-water.png'),png(strip));
writeFileSync(join(out,'EC-2-navigation.png'),png(renderMap(stateMap,{markers:true})));
const tiles=['grass','sand','slab','paving','deck','gravel','hedge','water'],atlas=new Canvas(128,48);
for(let y=0;y<3;y++)for(let x=0;x<tiles.length;x++)atlas.blit(getTile(tiles[x],y),x*16,y*16);
writeFileSync(join(out,'tileset.png'),png(atlas));
writeFileSync(join(out,'palette.json'),JSON.stringify(palette(),null,2)+'\n');
writeFileSync(join(out,'manifest.json'),JSON.stringify({version:VERSION,status:'isolated-layout-prototype',nativePixels:true,generator:'../source/generator.mjs',renderer:'../source/renderer.mjs',sourceArt:'../source/pixelart.js',sourceArtSha256:createHash('sha256').update(readFileSync(join(root,'source/pixelart.js'))).digest('hex'),fictionalLayouts:true,mapCount:entries.length,residenceCounts:counts,dimensions:{width:256,height:192,tileSize:16,columns:16,rows:12},seedRule:'FNV-1a(version + "|" + pool.id + "|" + revision), unsigned 32-bit',defaultRevision:0,collision:'0 = walkable; 1 = blocked. Coordinates are tile coordinates, origin at top left.',feetAnchor:'For a cell (x,y), place sprite feet at (x*16+8, y*16+15).',state:'Base layout ignores water readings, time, visits and encounters. Renderer applies state separately.',tileAtlas:{file:'tileset.png',tileSize:16,columns:tiles,rows:[0,1,2]},maps:entries},null,2)+'\n');
console.log(JSON.stringify({maps:entries.length,counts,uniquePNGs:hashes.size,dimensions:'256x192',allNavigationValid:true,contactSheet:join(out,'pool-maps-contact-sheet.png')},null,2));
