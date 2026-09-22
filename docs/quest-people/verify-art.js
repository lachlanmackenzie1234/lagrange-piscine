// Run in a loaded Pixel-theme test tab with agent-browser eval --stdin.
// Uses detached canvases; does not change saved game state or maintenance logs.
(async () => {
  await QuestMotion.ready;
  const animations = await (await fetch('assets/quest-motion/manifest.json')).json();
  const avatar = QuestCore.sanitizeAvatar(), directions = ['south','east','north','west'];
  const slots = QuestCore.SLOTS, sets = ['EC','AG','EP','EPP','GP'], rarities = ['common','uncommon','rare','vrare','epic','legend'];
  function sample(direction, equip = {}, motion = 'idle', elapsed = 0, scale = 3.2) {
    const calls = [];
    const ctx = {save:()=>{},restore:()=>{},setTransform:()=>{},getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0}), drawImage:(image,...rect)=>calls.push({image,rect:rect.slice(-4)})};
    QuestMotion.keeper(ctx, 32, 63, avatar, equip, {direction,motion,elapsed,scale});
    if(calls.length !== 1) throw Error('Character was sliced: '+calls.length);
    const {image,rect} = calls[0];
    return {image,rect,pixels:image.getContext('2d').getImageData(0,0,64,64).data};
  }
  const different = (a,b) => a.reduce((n,v,i)=>n+(v!==b[i]),0);
  let pieces=0, heads=0, samples=0;
  const failures=[];
  for(const dir of directions) {
    const basic=sample(dir);
    for(const set of sets) for(const rar of rarities) for(const slot of slots) {
      const withPiece=sample(dir,{[slot]:{res:set,rar}});
      if(!different(basic.pixels,withPiece.pixels)) failures.push([dir,set,rar,slot]);
      pieces++;
    }
    for(const equip of [{},Object.fromEntries(slots.map((slot,i)=>[slot,{res:sets[i%5],rar:'rare'}]))]) {
      const base=sample(dir,equip).pixels.slice(0,64*48*4);
      for(const motion of ['idle','walk','cast','victory','crouch']) {
        const clip=animations.keeper[dir][motion];let elapsed=0;
        for(let i=0;i<clip.f.length;i++) {
          const now=sample(dir,equip,motion,elapsed+1);elapsed+=clip.f[i].d;
          if(different(base,now.pixels.slice(0,64*48*4))) failures.push(['face',dir,motion,i]);
          heads++;
        }
      }
    }
    // Compare physical face pixels while the actor changes position and pose.
    for(const scale of [1.3125,2.5,3.395833,5.1]) {
      let reference;
      for(let i=0;i<32;i++) {
        const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
        const ctx=canvas.getContext('2d');ctx.setTransform(scale,0,0,scale,0,0);ctx.imageSmoothingEnabled=false;
        const original=ctx.drawImage.bind(ctx);let bounds;
        ctx.drawImage=(source,...r)=>{const m=ctx.getTransform();bounds=(r.length===2?[...r,source.width,source.height]:r.slice(-4)).map((v,j)=>v*(j%2?m.d:m.a));original(source,...r)};
        QuestMotion.keeper(ctx,30+i*.173,40+i*.193,avatar,{}, {direction:dir,motion:'walk',elapsed:i%8*95+1});
        const [x,y,w,h]=bounds.map(Math.round);
        const face=ctx.getImageData(x,y,w,Math.floor(h*.72)).data;
        if(reference && different(reference,face)) failures.push(['sampling',dir,scale,i]);
        reference=face;samples++;
      }
    }
  }
  window.__artQA={nativeViews:QuestMotion.status.nativePeople,visibleEquipmentCases:pieces,stableHeadPoses:heads,stablePhysicalSamples:samples,failures};
  if(failures.length) throw Error(JSON.stringify(window.__artQA));
  return window.__artQA;
})()
