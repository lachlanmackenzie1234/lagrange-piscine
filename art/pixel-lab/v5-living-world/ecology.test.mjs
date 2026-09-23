import test from 'node:test';
import assert from 'node:assert/strict';
import { TREE_SPECIES, forestProfile, treeRoster, canopyDisplacement, passageImpulse, advanceGrassMemory } from './ecology.mjs';

test('each residence visibly favours its requested tree species', () => {
  const pairs = { 'GP-18': 'oak', 'EPP-3': 'pine', 'AG-7': 'umbrella', 'EP-6B-75': 'holm', 'EC-2': 'birch' };
  for (const [id, species] of Object.entries(pairs)) {
    const roster = treeRoster(id, 14, 70);
    assert.equal(forestProfile(id).dominant, species); assert.equal(roster.length, 14);
    assert.equal(roster.filter(x => x === species).length, 10);
    assert.ok(new Set(roster).size >= 3); assert.ok(roster.every(x => TREE_SPECIES[x]));
    assert.deepEqual(treeRoster(id, 14, 70), roster);
  }
});
test('tree weighting preserves the roster size and can reach a full dominant stand', () => {
  for (const share of [40, 55, 70, 85, 100]) {
    const roster = treeRoster('EC-2', 14, share);
    assert.equal(roster.length, 14);
    assert.ok(Math.abs(roster.filter(x => x === 'birch').length - 14 * share / 100) < 1);
  }
  assert.ok(treeRoster('EC-2', 14, 100).every(x => x === 'birch'));
});
test('a footstep leaves a bend that recovers after the keeper passes', () => {
  const state = {}, impulse = passageImpulse({ x: 3, y: 0, size: 3 }, { x: 0, y: 0, vx: 58, vy: 0 });
  for (let i = 0; i < 12; i++) advanceGrassMemory(state, impulse, 1 / 60);
  assert.ok(state.bend > 1); assert.ok(state.flatten > .4);
  const pressed = state.bend; advanceGrassMemory(state, { bend: 0, pressure: 0 }, 1 / 60);
  assert.ok(state.bend > pressed * .8);
  for (let i = 0; i < 120; i++) advanceGrassMemory(state, { bend: 0, pressure: 0 }, 1 / 60);
  assert.ok(Math.abs(state.bend) < .05); assert.ok(state.flatten < .04);
});
test('movement direction changes the grass response and quiet motion settles it', () => {
  const tuft = { x: 0, y: 0, size: 2 };
  assert.ok(passageImpulse(tuft, { x: 0, y: 0, vx: 58 }).bend > 0);
  assert.ok(passageImpulse(tuft, { x: 0, y: 0, vx: -58 }).bend < 0);
  const state = { bend: 4, bendVelocity: 2, flatten: .8 }; advanceGrassMemory(state, { bend: 3, pressure: 1 }, .05, true);
  assert.deepEqual(state, { bend: 0, bendVelocity: 0, flatten: 0 });
});
test('canopy and shadow can share a bounded deterministic pose, including still air', () => {
  const tree = { species: 'birch', x: 150, y: 120, phase: 1.3, rustle: 0 };
  assert.equal(canopyDisplacement(tree, 12, 0), 0);
  assert.equal(canopyDisplacement(tree, 12, 1, true), 0);
  const poses = Array.from({ length: 60 }, (_, i) => canopyDisplacement(tree, i / 3, 1));
  assert.ok(new Set(poses).size > 3); assert.ok(poses.every(p => p >= -5 && p <= 5));
  assert.deepEqual(poses, Array.from({ length: 60 }, (_, i) => canopyDisplacement(tree, i / 3, 1)));
});
