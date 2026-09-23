import { Soundscape, readMix } from './engine.mjs';
import { TRACKS } from './catalog.mjs';

export function createSoundControls(){
  const button=document.getElementById('sound-toggle'),status=document.getElementById('sound-status'),mixPanel=document.getElementById('sound-mix'),selection=document.getElementById('music-theme');
  let audio;
  const render=()=>{
    if(!audio)return;const state=audio.snapshot();button.textContent=state.enabled?'Mute sound':'Enable sound';button.setAttribute('aria-pressed',String(state.enabled));
    status.textContent=!state.enabled?'Off · starts when you choose':state.background?'Paused while this page is away':state.track?TRACKS[state.track].title:'Ambience & effects';
    if(state.enabled)mixPanel.hidden=false;
    for(const channel of ['music','ambience','effects']){document.getElementById(`sound-${channel}`).value=Math.round(state.mix[channel]*100);document.getElementById(`sound-${channel}-value`).textContent=`${Math.round(state.mix[channel]*100)}%`;}
  };
  audio=new Soundscape({mix:readMix(localStorage),onChange:render});
  try{const saved=JSON.parse(localStorage.getItem('lagrange-quest.sound.mix.v1')||'{}');if(saved.selection)audio.setMusic(saved.selection);}catch{}
  selection.value=audio.selection;
  const save=()=>{try{localStorage.setItem('lagrange-quest.sound.mix.v1',JSON.stringify({...audio.mix,selection:audio.selection}));}catch{}};
  button.addEventListener('click',async()=>{button.disabled=true;try{if(audio.enabled)await audio.disable();else await audio.enable();}catch(error){status.textContent=error.message;}finally{button.disabled=false;}});
  for(const channel of ['music','ambience','effects'])document.getElementById(`sound-${channel}`).addEventListener('input',event=>{audio.setMix(channel,+event.target.value/100);save();});
  selection.addEventListener('change',()=>{audio.setMusic(selection.value);save();});
  const visibility=()=>audio.setBackground(document.hidden).catch(error=>{status.textContent=error.message;});document.addEventListener('visibilitychange',visibility);
  window.addEventListener('pagehide',()=>{document.removeEventListener('visibilitychange',visibility);audio.dispose();},{once:true});render();return audio;
}
