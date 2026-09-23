/* An art-tunable freedom / drag / cohesion scale, not one fluid for every material. */
const SurfaceDynamics = (() => {
  const clamp = (x,a=0,b=1) => Math.max(a,Math.min(b,x));
  const properties = {
    water: { grain: 0, mobility: 1, drag: .35, viscosity: .12, cohesion: 0, yield: 0, model: 'Incompressible flow' },
    grass: { grain: 0, mobility: .7, drag: 17, cohesion: 1, yield: 0, model: 'Rooted damped springs', stiffness: 82 },
    sand: { grain: .5, mobility: .65, drag: 3.5, cohesion: .08, yield: .08, model: 'Fine granular transport' },
    earth: { grain: .25, mobility: .09, drag: 12, cohesion: .65, yield: .12, model: 'Fine soil, dry aggregates or saturated mud' },
    gravel: { grain: .75, mobility: .025, drag: 30, cohesion: .08, yield: 1.2, windDriven: false, model: 'Small mineral grains; contact only' },
  };
  function wind(x,y,time,strength,angle){
    const gust=.72+Math.sin(time*.8+x*.012+y*.018)*.2+Math.sin(time*1.3-x*.009+y*.01)*.08;
    return {x:strength*(Math.cos(angle)*gust+Math.sin(y*.027+time*.4)*.12),y:strength*(Math.sin(angle)*gust+Math.sin(x*.023-time*.35)*.12)};
  }
  function transport(type,wet,force){const p=properties[type]||properties.earth;
    if(p.windDriven===false)return 0;
    if(type==='water')return p.mobility*Math.max(0,force);
    return p.mobility*Math.max(0,force-p.yield-clamp(wet)*p.cohesion*.4)*Math.max(0,1-clamp(wet)*1.25)**2;
  }
  // Granular drift has a positive gust envelope along the chosen direction.
  // Accumulate this velocity; using time * direction would jump on a wind turn.
  function drift(type,wet,x,y,time,strength,angle){
    const gust=.72+Math.sin(time*.8+x*.012+y*.018)*.2+Math.sin(time*1.3-x*.009+y*.01)*.08;
    const speed=22*clamp(strength)*transport(type,wet,strength)*gust;
    return {x:Math.cos(angle)*speed,y:Math.sin(angle)*speed};
  }
  function contact(type,wet,age,recovery=8){const p=properties[type]||properties.earth,t=clamp(age/recovery),rest=1-t*t*(3-2*t);
    const impulse=(1-Math.exp(-Math.max(0,age)*14))*Math.exp(-p.drag*Math.max(0,age)*.18);
    // A foot supplies much more force than wind, including to resistant gravel.
    const push=(1-Math.exp(-Math.max(0,age)*18))*rest;
    return {offset:(p.mobility*7*impulse+Math.sqrt(p.mobility)*5*push)*(1-p.cohesion*.45)*(type==='earth'?1+wet*.45:1-wet*.6),shade:rest*(.13+p.cohesion*.2),rest};
  }
  function spring(state,force,dt,quiet=false,wet=0){
    if(quiet){state.bend=state.bendVelocity=state.flatten=0;return}
    const p=properties.grass,k=p.stiffness*(1-wet*.18),drag=p.drag*(1+wet*.22),step=clamp(dt,0,.05);
    state.bendVelocity+=((force.bend*p.mobility/.7-state.bend)*k-drag*state.bendVelocity)*step;state.bend=clamp(state.bend+state.bendVelocity*step,-8,8);
    state.flatten+=(force.pressure-state.flatten)*(1-Math.exp(-(force.pressure>state.flatten?13:1.8)*step));
  }
  function windSpring(state,force,dt,wet=0,quiet=false){
    state.windBend??=0;state.windVelocity??=0;if(quiet){state.windBend=state.windVelocity=0;return}
    const p=properties.grass,k=p.stiffness/(.8+state.length/40),drag=p.drag*(1+wet*.3),target=force.x*4*p.mobility/.7*(1-wet*.3),step=clamp(dt,0,.05);
    state.windVelocity+=((target-state.windBend)*k-drag*state.windVelocity)*step;state.windBend=clamp(state.windBend+state.windVelocity*step,-6,6);
  }
  return {properties,wind,transport,drift,contact,spring,windSpring};
})();
if(typeof window!=='undefined')window.SurfaceDynamics=SurfaceDynamics;
if(typeof module!=='undefined')module.exports=SurfaceDynamics;
