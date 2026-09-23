import { DEFAULTS, TurnBattle, clamp } from './engine.mjs';
import { LivingWorld } from './world.mjs';
import { AdaptiveWorld } from './adaptive-world.mjs';
import { WATER_LOOKS } from './ecology.mjs';
import { createSoundControls } from './audio/controls.mjs';

const $ = id => document.getElementById(id);
const STORAGE_KEY = 'lagrange-quest.living-world.v5';
function readSettings() {
  const result = { ...DEFAULTS, quiet: matchMedia('(prefers-reduced-motion: reduce)').matches };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (['day', 'golden', 'dusk'].includes(saved.mood)) result.mood = saved.mood;
    for (const name of ['lushness', 'breeze', 'water', 'sun', 'keeper', 'body', 'treeBias']) if (Number.isFinite(saved[name])) { const el = $(name); result[name] = clamp(saved[name], +el.min, +el.max); }
    if (WATER_LOOKS[saved.poolState]) result.poolState = saved.poolState;
    for (const name of ['shadows', 'grid', 'quiet']) if (typeof saved[name] === 'boolean') result[name] = saved[name];
  } catch { /* Fresh settings are valid without persistent storage. */ }
  return result;
}
let noticeTimer;
function notice(message) { $('toast').textContent = message; $('toast').classList.add('visible'); clearTimeout(noticeTimer); noticeTimer = setTimeout(() => $('toast').classList.remove('visible'), 4200); }
let manualSettings = readSettings(), adaptive = null;
const sound=createSoundControls();
const world = new LivingWorld($('world'), { settings: manualSettings, onSelect: interaction, onNotice: notice, onWaterChange: syncWaterState, onCue:(id,position)=>{sound.listener=world.hero;sound.playCue(id,position);} });
let currentBattle = null, battleRAF = null, returnFocus = null, battleSoundKey=null;

const interactions = {
  pool: { type: 'THE BASIN', title: 'A little blue escape.', description: 'Watch the reflections move. Try a little care and see the water respond.', actions: [['Test the water', 'test'], ['Skim', 'skim'], ['Treat', 'treat']] },
  monster: { type: 'A GARDEN ENCOUNTER', title: 'Algue verte', description: 'A mischievous patch of algae has wandered out of the pool. It looks ready for a little trouble.', actions: [['Attack', 'battle'], ['Let it be', 'close']] },
  pump: { type: 'THE PUMP HOUSE', title: 'The garden’s quiet engine.', description: 'The pool pump and filter share a shelter with a coiled garden hose. Rinse the filter or water the nearby border.', actions: [['Backwash', 'wash'], ['Water the border', 'water-garden'], ['Keep exploring', 'close']] },
  house: { type: 'THE DEPOT', title: 'Ready for the next round.', description: 'Sun-warmed walls, a familiar coloured roof, and the tools of a good day’s work.', actions: [['Open the door', 'door'], ['Keep exploring', 'close']] },
};
function interaction(kind) {
  const panel = $('interaction');
  if (!kind || !interactions[kind]) { panel.hidden = true; return; }
  const item = interactions[kind];
  $('interaction-kind').textContent = item.type; $('interaction-title').textContent = item.title;
  $('interaction-description').textContent = kind === 'monster' && world.monster.calm ? 'Peaceful for now. You can practise another encounter whenever you like.' : item.description;
  const buttons = $('interaction-actions'); buttons.replaceChildren();
  for (const [label, action] of item.actions) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.dataset.action = action;
    if (action !== 'close') button.className = 'primary';
    button.addEventListener('click', () => { if (action === 'battle') openBattle(); else if (action === 'close') closeInteraction(); else world.action(action); }); buttons.append(button);
  }
  panel.hidden = false;
}
function closeInteraction() { interaction(null); world.selected = null; $('world').focus({ preventScroll: true }); }
$('interaction-close').addEventListener('click', closeInteraction);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('interaction').hidden && !$('battle').open) closeInteraction(); });
document.querySelectorAll('[data-discover]').forEach(button => button.addEventListener('click', () => { world.select(button.dataset.discover); if (matchMedia('(max-width:780px)').matches) $('canvas-wrap').scrollIntoView({ block: 'center', behavior: world.settings.quiet ? 'instant' : 'smooth' }); }));

function refreshControls() {
  const s = world.settings;
  sound.setEnvironment({wind:s.breeze/100,water:s.water/100,mood:s.mood,rain:world.weather?.rain||0});
  for (const name of ['lushness', 'breeze', 'water', 'sun', 'keeper', 'body', 'treeBias']) { const input = $(name); input.value = s[name]; input.style.setProperty('--progress', `${(s[name] - input.min) / (input.max - input.min) * 100}%`); }
  for (const name of ['shadows', 'grid', 'quiet']) $(name).checked = s[name];
  document.querySelectorAll('[data-mood]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mood === s.mood)));
  $('lushness-output').textContent = s.lushness < 30 ? 'Open' : s.lushness < 65 ? 'Leafy' : s.lushness < 85 ? 'Lush' : s.lushness < 100 ? 'Dense' : 'Full cover';
  $('breeze-output').textContent = s.breeze < 10 ? 'Still' : s.breeze < 55 ? 'Gentle' : s.breeze < 80 ? 'Breezy' : 'Gusty';
  $('water-output').textContent = s.water < 12 ? 'Calm' : s.water < 70 ? 'Shimmering' : 'Lively';
  $('sun-output').textContent = s.sun < 60 ? 'West' : s.sun < 115 ? 'High' : 'East';
  $('keeper-output').textContent = s.keeper < 70 ? 'Tiny' : s.keeper < 85 ? 'Small' : 'Closer';
  $('body-output').textContent = `${s.body}%`;
  $('treeBias-output').textContent = `${s.treeBias}%`;
  document.querySelectorAll('[data-pool-state]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.poolState === world.waterState)));
  $('time-label').textContent = { day: '12:40 · open skies', golden: '17:20 · golden light', dusk: '20:10 · blue hour' }[s.mood];
  $('scene-weather').textContent = s.quiet ? 'A moment of stillness' : s.mood === 'dusk' ? 'The garden at the edge of evening' : s.breeze > 70 ? 'A breeze through the pines' : 'A gentle coastal breeze';
}
function syncWaterState(state) { manualSettings.poolState = state; try { localStorage.setItem(STORAGE_KEY, JSON.stringify(manualSettings)); } catch {} document.querySelectorAll('[data-pool-state]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.poolState === state))); }
function settings(patch) { manualSettings = { ...manualSettings, ...patch }; adaptive.apply(); try { localStorage.setItem(STORAGE_KEY, JSON.stringify(manualSettings)); } catch { /* Controls still work without storage. */ } }
for (const name of ['lushness', 'breeze', 'water', 'sun', 'keeper', 'body', 'treeBias']) $(name).addEventListener('input', e => settings({ [name]: +e.target.value }));
document.querySelectorAll('[data-pool-state]').forEach(button => button.addEventListener('click', () => settings({ poolState: button.dataset.poolState })));
for (const name of ['shadows', 'grid', 'quiet']) $(name).addEventListener('change', e => settings({ [name]: e.target.checked }));
document.querySelectorAll('[data-mood]').forEach(button => button.addEventListener('click', () => settings({ mood: button.dataset.mood })));
$('pause').addEventListener('click', () => { world.paused = !world.paused; $('pause').textContent = world.paused ? '▷' : 'Ⅱ'; $('pause').setAttribute('aria-pressed', String(world.paused)); $('pause').setAttribute('aria-label', world.paused ? 'Resume ambient animation' : 'Pause ambient animation'); });
$('reset').addEventListener('click', () => { if ($('battle').open) closeBattle(); world.reset(); adaptive.resetPreview(); settings({ ...DEFAULTS, quiet: matchMedia('(prefers-reduced-motion: reduce)').matches }); world.paused = false; $('pause').textContent = 'Ⅱ'; $('pause').setAttribute('aria-pressed', 'false'); $('pause').setAttribute('aria-label', 'Pause ambient animation'); notice('A fresh start in the garden. The world is yours again.'); });
$('save-look').addEventListener('click', () => { const data = { study: 'Lagrange Quest · Living world 05', version: 2, scene: world.gardenId, resolution: [512, 384], settings: { ...world.settings }, context: adaptive.exportState() }; const blob = new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' }); const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'lagrange-quest-atmosphere.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); notice('Atmosphere saved. Your settings also stay in this browser.'); });

function updateBattle(b) {
  const soundKey=`${b.turn}/${b.phase}/${b.outcome}`;
  if(soundKey!==battleSoundKey){battleSoundKey=soundKey;if(b.outcome){sound.setScene('result');sound.playCue(b.outcome);}else if(b.phase==='cast')sound.playCue(b.move);else if(b.phase==='hit')sound.playCue('hit');}
  $('enemy-hp').value = b.enemy; $('hero-hp').value = b.hero; $('enemy-hp-text').textContent = `${b.enemy} / 84`; $('hero-hp-text').textContent = `${b.hero} / 72`;
  $('battle-message').textContent = b.message;
  $('turn-label').textContent = b.outcome === 'win' ? 'A LITTLE VICTORY' : b.outcome === 'lose' ? 'CATCH YOUR BREATH' : b.phase === 'choice' ? `YOUR TURN · ${b.turn}` : ['reply', 'hit', 'recover'].includes(b.phase) ? 'ALGUE VERTE’S TURN' : 'THE KEEPER’S TURN';
  document.querySelectorAll('[data-move]').forEach(button => button.disabled = b.phase !== 'choice');
  $('battle-moves').hidden = !!b.outcome; $('battle-done').hidden = !b.outcome;
  if (b.outcome === 'win') world.monster.calm = true;
  if (b.outcome) $('battle-done').focus({ preventScroll: true });
}
function openBattle() {
  if (!world.art || currentBattle) return;
  returnFocus = document.activeElement; interaction(null); world.hero.path = []; world.arrival = null; world.suspended = true;
  battleSoundKey=null;sound.setScene('battle');sound.playCue('encounter');
  currentBattle = new TurnBattle(updateBattle); updateBattle(currentBattle); $('battle').showModal();
  let last = performance.now(), t = 0;
  const render = now => { if (!currentBattle) return; const dt = Math.min(.05, (now - last) / 1000); last = now; if (!document.hidden) { t += dt; currentBattle.tick(dt); world.drawBattle($('battle-canvas'), currentBattle, t); } battleRAF = requestAnimationFrame(render); };
  battleRAF = requestAnimationFrame(render); $('battle-moves').querySelector('button').focus({ preventScroll: true });
}
function closeBattle() {
  const outcome = currentBattle?.outcome; currentBattle?.cancel(); currentBattle = null; cancelAnimationFrame(battleRAF); world.suspended = false; world.selected = null;
  if ($('battle').open) $('battle').close();
  sound.setScene('garden');battleSoundKey=null;
  if (outcome === 'win') { world.setWaterState('treated'); world.ripple(POOL_CENTRE[0], POOL_CENTRE[1], 'treat', 3.2); notice('The garden feels a little calmer. The creature will remember.'); }
  else if (outcome === 'lose') notice('Back in the garden. Try a different tool next time.');
  (returnFocus?.isConnected && !returnFocus.closest('[hidden]') ? returnFocus : $('world')).focus({ preventScroll: true });
}
const POOL_CENTRE = [269, 204];
$('retreat').addEventListener('click', closeBattle); $('battle-done').addEventListener('click', closeBattle);
$('battle').addEventListener('cancel', e => { e.preventDefault(); closeBattle(); });
document.querySelectorAll('[data-move]').forEach(button => button.addEventListener('click', () => currentBattle?.choose(button.dataset.move)));
adaptive = new AdaptiveWorld(world, { getManual: () => manualSettings, onApplied: refreshControls, onNotice: notice, onGardenChange: () => { if ($('battle').open) closeBattle(); } });
world.ready.then(() => { $('loading').hidden = true; }).catch(error => { $('loading').querySelector('span:last-child').textContent = 'The art could not load. Reload the garden to try again.'; console.error(error); });
window.addEventListener('pagehide', () => { currentBattle?.cancel(); cancelAnimationFrame(battleRAF); clearTimeout(noticeTimer); adaptive.dispose(); world.dispose(); });
window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
// Expose read-only observations for local browser verification and future study
// comparisons. The simulator never imports Store, Sync, or the live app shell.
window.QuestLab = { snapshot: () => ({ ...world.snapshot(), context: adaptive.exportState(), audio:sound.snapshot(), battle: currentBattle ? { phase: currentBattle.phase, hero: currentBattle.hero, enemy: currentBattle.enemy, outcome: currentBattle.outcome, turn: currentBattle.turn } : null }) };
