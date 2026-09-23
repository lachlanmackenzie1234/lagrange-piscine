/* User-enabled bridge to the supplied v5 procedural sound engine. */
const SurfaceSound = (() => {
  const ready=import('../pixel-lab/v5-living-world/audio/engine.mjs');
  ready.catch(()=>{});
  const clamp=v=>Math.max(0,Math.min(1,v));
  class Preview {
    constructor(){this.engine=null;this.steps=0;this.error='';this.disposed=false;
      this.button=document.getElementById('sound-toggle');this.status=document.getElementById('sound-status');this.button.disabled=true;
      this.button.addEventListener('click',async()=>{if(!this.engine)return;this.button.disabled=true;try{this.error='';if(this.engine.enabled)await this.engine.disable();else await this.engine.enable()}catch(e){this.error=e.message}finally{this.button.disabled=false;this.render()}});
      for(const name of ['music','ambience','effects'])document.getElementById('sound-'+name).addEventListener('input',e=>{const value=+e.target.value;document.getElementById('sound-'+name+'-value').textContent=value+'%';this.engine?.setMix(name,value/100)});
      document.getElementById('sound-track').addEventListener('change',e=>this.engine?.setMusic(e.target.value));
      ready.then(({Soundscape})=>{if(this.disposed)return;this.engine=new Soundscape({mix:Object.fromEntries(['music','ambience','effects'].map(name=>[name,+document.getElementById('sound-'+name).value/100])),onChange:()=>this.render()});this.engine.setMusic(document.getElementById('sound-track').value);this.engine.setBackground(document.hidden);this.button.disabled=false;this.render()}).catch(e=>{this.error='Sound library unavailable: '+e.message;this.render()});
      this.visibility=()=>this.engine?.setBackground(document.hidden).catch(e=>{this.error=e.message;this.render()});document.addEventListener('visibilitychange',this.visibility);
    }
    fault(error){this.error=error.message||'Sound unavailable';this.engine?.disable().catch(()=>{});this.render()}
    update(field,hero,look){if(!this.engine)return;try{const hour=field.options.colourDriver==='recorded'&&Number.isFinite(field.options.observedHour)?field.options.observedHour:field.options.studyHour;
      this.engine.listener={x:hero.x,y:hero.y};this.engine.setEnvironment({wind:field.options.wind,water:clamp(field.water.active.length/(512*384)*2+field.water.liquidAt(hero.x,hero.y)*.5)*(1-field.weather.ice),rain:field.options.rain,mood:field.adaptive?.mood||(hour>=19||hour<6||look.palette==='dusk'?'dusk':'golden'),active:true});
      }catch(error){this.fault(error)}
    }
    step(event){if(!this.engine?.enabled)return;try{let cue;
      if(event.liquid>.15)cue='splash';else if(event.ice>.65||event.material.gravel>.5)cue='stone-step';else cue='grass-step';
      this.engine.playCue(cue,event);if(event.material.grass>.6&&++this.steps%4===0)this.engine.playCue('rustle',event);
      }catch(error){this.fault(error)}
    }
    render(){if(!this.status)return;const s=this.snapshot();this.button.textContent=s.enabled?'Mute sound':'Enable sound';this.button.setAttribute('aria-pressed',String(s.enabled));this.status.textContent=this.error||(s.background&&s.enabled?'Paused while away':s.enabled?'Playing · '+(s.track||'ambience'):'Sound off');}
    snapshot(){return this.engine?.snapshot()||{enabled:false,state:'uninitialized',voices:0,ambientBeds:0,timerActive:false,noiseBytes:0}}
    dispose(){this.disposed=true;document.removeEventListener('visibilitychange',this.visibility);return this.engine?.dispose()}
  }
  return{Preview,ready};
})();
window.SurfaceSound=SurfaceSound;
