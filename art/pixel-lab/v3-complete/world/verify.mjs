import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {generateMap,validateMap,hash} from './source/generator.mjs';
const pools=JSON.parse(readFileSync(new URL('./pools.json',import.meta.url),'utf8'));
const geometry=m=>JSON.stringify({pool:m.pool,deck:m.deck,arena:m.arena,objects:m.objects,anchors:m.anchors,ground:m.ground,collision:m.collision});
assert.equal(pools.length,23);
assert.equal(new Set(pools.map(p=>p.id)).size,23);
const snapshots=new Map(pools.map(p=>[p.id,JSON.stringify(generateMap(p))]));
let cases=0,maxAttempts=0,minWalkable=Infinity;
for(const p of pools){
  for(let revision=0;revision<25;revision++){
    const map=generateMap(p,{revision}),validation=validateMap(map);
    assert.ok(validation.valid,`${p.id} revision ${revision}: ${validation.errors}`);
    assert.equal(JSON.stringify(map),JSON.stringify(generateMap({...p},{revision})),'Rebuilding a seed must be byte-identical');
    assert.equal(map.seed,hash(`${map.version}|${p.id}|${revision}`));
    maxAttempts=Math.max(maxAttempts,map.generationAttempt);minWalkable=Math.min(minWalkable,validation.walkableCells);cases++;
  }
  assert.notEqual(geometry(generateMap(p)),geometry(generateMap(p,{revision:1})),'Changing revision must change real geometry');
  assert.equal(snapshots.get(p.id),JSON.stringify(generateMap({...p,waterState:'critique',dirt:3,visits:99,winter:true,operator:'test'})),'Live state must not move the property');
}
for(const p of [...pools].reverse())assert.equal(snapshots.get(p.id),JSON.stringify(generateMap(p)),'Catalogue order must not change maps');
assert.throws(()=>generateMap({res:'EC'}));assert.throws(()=>generateMap({...pools[0],res:'UNKNOWN'}));assert.throws(()=>generateMap(pools[0],{revision:-1}));
assert.equal(new Set(pools.map(p=>geometry(generateMap(p)))).size,23,'Each pool must have a distinct actual layout');
const report={passed:true,poolCount:23,testedRevisionsPerPool:25,testedLayouts:cases,maxRejectedAttempts:maxAttempts,minWalkableCells:minWalkable,checks:['all walkable cells connected','every functional anchor reachable','3x3 encounter area clear','structures and water do not overlap','paths remain unblocked','same seed reproduces byte-identical JSON','pool order does not matter','live state does not change layout','reroll changes geometry','all 23 default layouts distinct','invalid inputs rejected']};
writeFileSync(new URL('./verification.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
