import { Soundscape } from './engine.mjs';
import { TRACKS, CUES, AMBIENCES } from './catalog.mjs';

const status=document.getElementById('listening-status'),stop=document.getElementById('stop-audio');
let audio,ambience=null,lastCue=null,arming=null,cueTimer=null;
function render(){
  if(!audio)return;const state=audio.snapshot();stop.disabled=!state.enabled;
  const parts=[];if(state.track)parts.push(TRACKS[state.track].title);if(ambience&&state.enabled)parts.push(AMBIENCES[ambience].title);if(lastCue&&state.enabled)parts.push(CUES[lastCue].title);
  status.textContent=!state.enabled?'Choose a theme, atmosphere, or sound.':state.background?'Paused while this page is away':parts.join(' · ')||'Ready to listen.';
  document.querySelectorAll('[data-track]').forEach(b=>{const playing=state.enabled&&state.track===b.dataset.track;b.textContent=playing?'Pause theme Ⅱ':'Play theme ▷';b.setAttribute('aria-label',`${playing?'Pause':'Play'} ${TRACKS[b.dataset.track].title}`);b.setAttribute('aria-pressed',String(playing));});
  document.querySelectorAll('[data-ambience]').forEach(b=>b.setAttribute('aria-pressed',String(state.enabled&&ambience===b.dataset.ambience)));
}
audio=new Soundscape({mix:{music:.55,ambience:.6,effects:.7},onChange:render});audio.setMusic('off');audio.setEnvironment({active:false});
async function enable(){if(audio.enabled&&audio.ctx?.state==='running')return true;if(!arming)arming=audio.enable().finally(()=>arming=null);return arming;}
function handle(action){return async()=>{try{await action();render();}catch(error){status.textContent=error.message;}};}

for(const [id,track] of Object.entries(TRACKS)){
  const article=document.createElement('article');article.className='music-card';article.style.setProperty('--tone',track.colour);
  const meta=document.createElement('span');meta.textContent=`${track.bpm} BPM · ${Math.round(track.bars*4*60/track.bpm)} SECOND LOOP`;
  const h=document.createElement('h3');h.textContent=track.title;const p=document.createElement('p');p.textContent=track.mood;
  const bars=document.createElement('div');bars.className='score-bars';bars.setAttribute('aria-hidden','true');for(let i=0;i<24;i++){const bar=document.createElement('i');bar.style.height=`${18+(i*13+id.length*11)%35}px`;bars.append(bar);}
  const actions=document.createElement('div');actions.className='card-actions';const play=document.createElement('button');play.type='button';play.dataset.track=id;play.textContent='Play theme ▷';play.setAttribute('aria-label',`Play ${track.title}`);play.setAttribute('aria-pressed','false');
  play.addEventListener('click',handle(async()=>{lastCue=null;if(audio.enabled&&audio.track===id){audio.setMusic('off');if(!ambience)await audio.disable();}else{audio.setMusic(id);await enable();}}));
  const download=document.createElement('a');download.href=`audio/exports/music/${id}.mp3`;download.download=`${id}.mp3`;download.textContent='MP3 ↓';download.setAttribute('aria-label',`Download ${track.title}`);actions.append(play,download);article.append(meta,h,p,bars,actions);document.getElementById('music-cards').append(article);
}
for(const [id,preset] of Object.entries(AMBIENCES)){
  const card=document.createElement('article');card.className='ambience-card';const h=document.createElement('h3');h.textContent=preset.title;const p=document.createElement('p');p.textContent=preset.description;
  const play=document.createElement('button');play.type='button';play.textContent='Listen ▷';play.dataset.ambience=id;play.setAttribute('aria-label',`Listen to ${preset.title}`);play.setAttribute('aria-pressed','false');
  play.addEventListener('click',handle(async()=>{lastCue=null;if(ambience===id&&audio.enabled){ambience=null;audio.setEnvironment({active:false});if(!audio.track)await audio.disable();}else{ambience=id;audio.setEnvironment({...preset,active:true});await enable();}}));card.append(h,p,play);document.getElementById('ambience-cards').append(card);
}
for(const group of [...new Set(Object.values(CUES).map(c=>c.group))]){
  const h=document.createElement('h3');h.className='effect-heading';h.textContent=group;const grid=document.createElement('div');grid.className='effect-grid';
  for(const [id,cue] of Object.entries(CUES).filter(([,cue])=>cue.group===group)){
    const card=document.createElement('div');card.className='effect-card';const play=document.createElement('button');play.type='button';play.dataset.cue=id;play.setAttribute('aria-label',`Play ${cue.title}`);
    const title=document.createElement('b');title.textContent=`▷ ${cue.title}`;const desc=document.createElement('small');desc.textContent=cue.description;play.append(title,desc);
    play.addEventListener('click',handle(async()=>{await enable();lastCue=id;audio.playCue(id);clearTimeout(cueTimer);cueTimer=setTimeout(()=>{lastCue=null;render();},(cue.duration+.3)*1000);}));
    const download=document.createElement('a');download.href=`audio/exports/effects/${id}.wav`;download.download=`${id}.wav`;download.textContent='↓';download.setAttribute('aria-label',`Download ${cue.title}`);card.append(play,download);grid.append(card);
  }
  document.getElementById('effect-groups').append(h,grid);
}
for(const channel of ['music','ambience','effects'])document.getElementById(`library-${channel}`).addEventListener('input',e=>audio.setMix(channel,+e.target.value/100));
stop.addEventListener('click',handle(async()=>{lastCue=null;await audio.disable();}));
document.addEventListener('keydown',e=>{if(e.key==='Escape')audio.disable();});
const visibility=()=>audio.setBackground(document.hidden).catch(error=>{status.textContent=error.message;});document.addEventListener('visibilitychange',visibility);
window.addEventListener('pagehide',()=>{clearTimeout(cueTimer);document.removeEventListener('visibilitychange',visibility);audio.dispose();},{once:true});
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
window.SoundLab={snapshot:()=>audio.snapshot()};render();
