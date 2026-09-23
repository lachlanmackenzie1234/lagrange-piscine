/* Optional playback helpers. This module does not change the live app. */
export const EQUIPMENT_SLOTS=['tête','torse','jambes','pieds','amulette','perche','robot','balai'];
export const SET_IDS=['EC','AG','EP','EPP','GP'];
export const RARITIES=['common','uncommon','rare','vrare','epic','legend'];

export function fullSetFor(equipment={}){
  const sets=EQUIPMENT_SLOTS.map(slot=>equipment[slot]?.res);
  return sets.length===8&&SET_IDS.includes(sets[0])&&sets.every(set=>set===sets[0])?sets[0]:null;
}

export function activeAuras(state={}){
  // Idle means no translation and no attack, cast, hit, spawn or defeat action.
  if(state.alive===false||state.visible===false||state.moving||state.motion&&state.motion!=='idle'||state.action)return [];
  if(state.role==='player'){
    const set=fullSetFor(state.equipment);
    return set?[`set-${set}`]:[];
  }
  if(state.role==='monster'||state.role==='creature'&&state.rarity){
    const rarity=state.rarity||state.tier||'common';
    return RARITIES.includes(rarity)?[`rarity-${rarity}`]:[];
  }
  return [];
}

export function frameAt(manifest,clipId,elapsedMs=0,{reducedMotion=false}={}){
  const clip=manifest.clips[clipId];
  if(!clip)throw new Error(`Unknown animation clip: ${clipId}`);
  let index=0;
  if(!clip.loop&&elapsedMs>=clip.durationMs&&clip.disappearOnEnd)index=clip.frames.length-1;
  else if(reducedMotion)index=clip.reducedMotionFrame??0;
  else{
    const elapsed=Number.isFinite(elapsedMs)?Math.max(0,elapsedMs):0;
    let t=clip.loop?elapsed%clip.durationMs:Math.min(elapsed,clip.durationMs-1);
    for(let i=0;i<clip.frames.length;i++){
      if(t<clip.frames[i].durationMs){index=i;break;}
      t-=clip.frames[i].durationMs;
    }
  }
  const frame=clip.frames[index];
  return {clipId,index,file:frame.file,atlas:clip.atlas,sourceRect:frame.sourceRect,
    anchor:clip.anchor,offset:reducedMotion?[0,0]:frame.offset||[0,0],layer:clip.layer||'actor',
    durationMs:frame.durationMs,finished:!clip.loop&&elapsedMs>=clip.durationMs};
}

export function auraLayers(manifest,state,elapsedMs=0,options={}){
  return activeAuras(state).flatMap(id=>{
    const group=manifest.auraGroups[id];
    if(!group)return [];
    return [frameAt(manifest,group.back,elapsedMs,options),frameAt(manifest,group.front,elapsedMs,options)];
  });
}

export function characterClip(set,direction,motion='idle'){
  if(!SET_IDS.includes(set))throw new Error(`Unknown set: ${set}`);
  if(!['south','east','west','north'].includes(direction))throw new Error(`Unknown direction: ${direction}`);
  if(!['idle','walk','cast','hit','victory','spawn','defeat','flee','crouch'].includes(motion))throw new Error(`Unknown motion: ${motion}`);
  return `character/${set}/${direction}/${motion}`;
}
