import test from 'node:test';
import assert from 'node:assert/strict';
import { createMeadow, BLADE_ROOTS, meadowHeight, meadowShape, foregroundRoots } from './meadow.mjs';

test('fine grass masks each root at material boundaries without leaving whole tile gaps', () => {
  const eligible = (x,y) => x>=0 && y>=0 && x<64 && y<64 && !(x>=21 && x<29);
  const cells=createMeadow({width:64,height:64,eligible});
  const expected=[];
  for(let y=4;y<64;y+=8)for(let x=4;x<64;x+=8)for(const [dx,dy]of BLADE_ROOTS)if(eligible(x+dx,y+dy))expected.push(`${x+dx},${y+dy}`);
  const actual=cells.flatMap(c=>BLADE_ROOTS.flatMap(([dx,dy],i)=>c.mask&(1<<i)?[`${c.x+dx},${c.y+dy}`]:[]));
  assert.deepEqual(new Set(actual),new Set(expected));
  assert.ok(cells.some(c=>c.mask!==63));
  assert.deepEqual(cells,createMeadow({width:64,height:64,eligible}));
});
test('growth and keeper proportions determine grass depth, with short maintained borders', () => {
  for(const maximum of [6,13,18]) {
    const cut=meadowHeight(.18,'wild',0,maximum),tall=meadowHeight(1,'wild',0,maximum);
    assert.ok(cut<tall); assert.equal(tall,maximum);
    assert.ok(meadowHeight(1,'trimmed',0,maximum)<tall);
    assert.ok(meadowHeight(1,'wild',1,maximum)<tall);
  }
});
test('only roots in front of the feet can cover the keeper and quiet motion removes sway', () => {
  const cell={x:44,y:44,mask:63,variant:1,zone:'wild',bend:4,flatten:.2};
  for(const footY of [40,44,48]){
    const mask=foregroundRoots(cell,footY);
    BLADE_ROOTS.forEach(([,dy],i)=>assert.equal(!!(mask&(1<<i)),44+dy>=footY));
  }
  const shape=meadowShape(cell,{growth:1,lushness:100,time:2,wind:1,quiet:true,maximum:13});
  assert.equal(shape.pose,0);assert.equal(shape.amount,6);assert.ok(shape.height<=13);
});
