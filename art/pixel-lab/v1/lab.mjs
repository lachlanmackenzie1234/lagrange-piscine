import {SETS,SLOTS,SLOT_IDS,RARITIES,MONSTERS,trainer,creature,monster,icon,stage,isometricStudy} from './assets.mjs';

const state={set:'EC',slot:'head',rarity:'common',scene:'courtyard'};
const $=s=>document.querySelector(s);
const set=()=>SETS.find(s=>s.id===state.set);
function paint(canvas,r){canvas.width=r.width;canvas.height=r.height;const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.putImageData(new ImageData(r.data,r.width,r.height),0,0);}
function sample(r,label){const c=document.createElement('canvas');c.setAttribute('role','img');c.setAttribute('aria-label',label);paint(c,r);return c;}
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;}
function download(r,name){const c=document.createElement('canvas');paint(c,r);c.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);},'image/png');}

for(const s of SETS){
  const b=el('button');b.type='button';b.dataset.set=s.id;b.setAttribute('aria-pressed',String(s.id===state.set));
  const swatch=el('span','swatch');swatch.style.background=s.pal[1];b.append(swatch,el('small','',s.id),document.createTextNode(s.name));
  b.addEventListener('click',()=>{state.set=s.id;render();});$('.set-picker').append(b);
}
SLOT_IDS.forEach((id,i)=>{
  const b=el('button','slot');b.type='button';b.dataset.slot=id;b.setAttribute('aria-pressed',String(id===state.slot));b.append(sample(icon('EC',id),SETS[0].items[i]));
  b.addEventListener('click',()=>{state.slot=id;render();});$(i<4?'#left-slots':'#right-slots').append(b);
});
for(const rarity of RARITIES){
  const b=el('button');b.type='button';b.dataset.rarity=rarity.id;b.title=rarity.name;b.style.setProperty('--tier',rarity.color);b.setAttribute('aria-label',rarity.name);b.setAttribute('aria-pressed',String(rarity.id===state.rarity));
  for(let i=0;i<rarity.rank;i++)b.append(el('span'));
  b.addEventListener('click',()=>{state.rarity=rarity.id;render();});$('.rarity-picker').append(b);
}
document.querySelectorAll('[data-scene]').forEach(b=>b.addEventListener('click',()=>{state.scene=b.dataset.scene;render();}));
$('#download-item').addEventListener('click',()=>download(icon(state.set,state.slot,state.rarity),`item-${state.set.toLowerCase()}-${state.slot}-${state.rarity}.png`));
$('#native-toggle').addEventListener('click',e=>{const on=document.body.classList.toggle('native-view');e.currentTarget.setAttribute('aria-pressed',String(on));e.currentTarget.textContent=on?'View enlarged':'View at 1×';});
$('#background-toggle').addEventListener('click',e=>{const on=document.body.classList.toggle('dark-ground');e.currentTarget.setAttribute('aria-pressed',String(on));e.currentTarget.textContent=on?'Light ground':'Dark ground';});

for(const s of SETS){
  const card=el('article','guide-card'),a=el('a'),ground=el('div','sample-ground');a.href=`exports/creature/creature-${s.id.toLowerCase()}.png`;a.download='';a.title=`Download ${s.creature} · 24 × 24 PNG`;
  ground.append(sample(creature(s.id),s.creature));a.append(ground,el('h3','',s.creature));card.append(a,el('span','zone',`${s.id} / ${s.subtitle.toUpperCase()}`),el('p','',s.creatureNote));$('#creature-guide').append(card);
}
for(const m of MONSTERS){
  const card=el('article','guide-card'),ground=el('a','sample-ground'),text=el('div');ground.href=`exports/monster/monster-${m.id}.png`;ground.download='';ground.title=`Download ${m.name} · 28 × 24 PNG`;ground.append(sample(monster(m.id),m.name));text.append(el('h3','',m.name),el('p','',m.note));card.append(ground,text);$('#monster-guide').append(card);
}
for(const s of SETS){
  const tr=el('tr'),label=el('td');label.append(el('strong','',s.name),el('small','',`${s.id} · ${s.subtitle}`));tr.append(label);
  SLOT_IDS.forEach((id,i)=>{const td=el('td'),a=el('a');a.href=`exports/item/item-${s.id.toLowerCase()}-${id}-common.png`;a.download='';a.title=`${s.items[i]} · 16 × 16 PNG`;a.append(sample(icon(s.id,id),s.items[i]));td.append(a);tr.append(td);});$('#kit-rows').append(tr);
}
const captions={
  courtyard:'The net is ready. The water is suspiciously quiet.',
  encounter:'Algue verte is making itself at home. Time to get to work.',
  tactical:'A short step, a long reach. Plan the next move.',
  isometric:'A little more depth. A little less room to breathe.',
};
const notes={courtyard:'Orthographic ground · shallow front faces',encounter:'Battle composition · illustrative encounter',tactical:'8 × 6 grid · static AP / MP / timer study',isometric:'6 × 6 diamonds · static projection study'};
function render(){
  const s=set(),r=RARITIES.find(x=>x.id===state.rarity),idx=SLOT_IDS.indexOf(state.slot);
  document.documentElement.style.setProperty('--accent',s.pal[1]);document.documentElement.style.setProperty('--accent-light',s.pal[0]);document.documentElement.style.setProperty('--rarity',r.color);
  document.querySelectorAll('[data-set]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.set===state.set)));
  document.querySelectorAll('[data-slot]').forEach(b=>{const i=SLOT_IDS.indexOf(b.dataset.slot);b.setAttribute('aria-pressed',String(b.dataset.slot===state.slot));b.title=s.items[i];b.setAttribute('aria-label',s.items[i]);paint(b.querySelector('canvas'),icon(s.id,b.dataset.slot,state.rarity));b.querySelector('canvas').setAttribute('aria-label',s.items[i]);});
  document.querySelectorAll('[data-rarity]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.rarity===state.rarity)));
  document.querySelectorAll('[data-scene]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scene===state.scene)));
  $('#set-name').textContent=s.name;$('#set-code').textContent=`${s.id} / ${s.subtitle.toUpperCase()}`;$('#set-mark').textContent=s.id;$('#set-motif').textContent=s.motif;
  $('#zone-label').textContent=s.subtitle.toUpperCase();$('#creature-name').textContent=s.creature;
  $('#selected-slot').textContent=`${SLOTS[idx].toUpperCase()} / ${state.slot.toUpperCase()}`;$('#selected-name').textContent=s.items[idx];$('#selected-rarity').textContent=`${r.name} · ${s.name}`;$('#rarity-name').textContent=r.name.toUpperCase();
  $('#scene-place').textContent=`${s.subtitle.toUpperCase()} · ${state.scene.toUpperCase()}`;$('#scene-meta').textContent=state.scene==='isometric'?'2:1 DIAMONDS':'16 × 16 TILES';$('#scene-caption').textContent=captions[state.scene];$('#scene-note').textContent=notes[state.scene];
  $('#battle-hud').hidden=state.scene!=='tactical';
  paint($('#hero-creature'),creature(s.id));$('#hero-creature').setAttribute('aria-label',s.creature);$('.mascot span').textContent=`MEET ${s.creature.toUpperCase()}`;
  paint($('#trainer'),trainer(s.id));paint($('#selected-icon'),icon(s.id,state.slot,state.rarity));paint($('#companion'),creature(s.id));paint($('#foe'),monster('algue'));
  paint($('#scene'),state.scene==='isometric'?isometricStudy(s.id):stage(s.id,state.scene));$('#scene').setAttribute('aria-label',`${s.subtitle}, ${state.scene} composition study, 128 by 96 pixels`);
}
render();
