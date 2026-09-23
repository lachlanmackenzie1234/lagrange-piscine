import test from 'node:test';
import assert from 'node:assert/strict';
import { findPath, reachablePath, TurnBattle } from './engine.mjs';
test('walking routes around the basin and never crosses a blocked tile', () => {
  const grid = Array.from({length:7}, () => Array(8).fill(0));
  for(let y=1;y<6;y++) for(let x=2;x<6;x++) grid[y][x]=1;
  const path=findPath(grid,[1,3],[6,3]);
  assert.deepEqual(path.at(-1),[6,3]);
  assert.ok(path.length>6);
  path.forEach(([x,y],i)=>{assert.equal(grid[y][x],0);if(i)assert.equal(Math.abs(x-path[i-1][0])+Math.abs(y-path[i-1][1]),1);});
  assert.deepEqual(findPath(grid,[1,3],[3,3]),[]);
});
test('tapping an obstacle selects a reachable edge without walking through it', () => {
  const grid = [[0,0,0],[0,1,0],[0,0,0]];
  const path=reachablePath(grid,[0,0],[1,1]);
  assert.ok(path.length); assert.equal(grid[path.at(-1)[1]][path.at(-1)[0]],0);
});
test('a turn locks input, applies each impact once and returns control after the response', () => {
  const b=new TurnBattle(); assert.ok(b.choose('brush'));assert.equal(b.choose('burst'),false);
  b.tick(.31);assert.equal(b.enemy,67);assert.equal(b.hero,72);
  b.tick(.1);assert.equal(b.enemy,67);
  b.tick(3);assert.equal(b.enemy,67);assert.equal(b.hero,59);assert.equal(b.phase,'choice');assert.equal(b.turn,2);
});
test('victory stops the enemy response; retreat cancels pending damage', () => {
  const b=new TurnBattle();b.enemy=20;b.choose('burst');b.tick(5);assert.equal(b.outcome,'win');assert.equal(b.hero,72);
  const c=new TurnBattle();c.choose('brush');c.cancel();c.tick(5);assert.equal(c.enemy,84);assert.equal(c.hero,72);
});
test('defeat reaches a terminal state with no further turns', () => {
  const b=new TurnBattle();b.hero=10;b.choose('net');b.tick(5);assert.equal(b.outcome,'lose');assert.equal(b.hero,0);assert.equal(b.choose('burst'),false);
});
