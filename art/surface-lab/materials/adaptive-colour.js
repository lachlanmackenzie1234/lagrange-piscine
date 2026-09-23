/* Reversible, optional art grading from observed weather and local study time. */
const SurfaceAdaptiveColour = (() => {
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t;
  const blend=(a,b,t)=>a.map((v,i)=>Math.round(mix(v,b[i],t)));
  function hour(at){const time=Date.parse(at);if(!Number.isFinite(time))return null;const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',hourCycle:'h23',hour:'2-digit',minute:'2-digit'}).formatToParts(new Date(time));return Number(parts.find(p=>p.type==='hour').value)+Number(parts.find(p=>p.type==='minute').value)/60}
  function derive({hour=18,rain=0,humidity=.55,sun=.65,temperature=18,frost=0}={}){
    const h=((hour%24)+24)%24,day=Math.max(0,Math.sin((h-6)/12*Math.PI)),night=1-clamp(day/.45),warm=clamp(Math.exp(-(((h-7)/1.5)**2))+Math.exp(-(((h-18.5)/1.6)**2)));
    const cloud=clamp(rain*.75+humidity*.18+(1-sun)*.22),heat=clamp((temperature-18)/28,-.6,.8);
    let key=blend([245,244,228],[255,205,139],warm);key=blend(key,[182,208,230],cloud*.65);key=blend(key,[152,185,233],night*(1-warm*.9)*.8);key=key.map((v,i)=>Math.round(clamp(v+(i===0?heat*9:i===2?-heat*7:0),0,255)));
    let shadow=blend([58,78,108],[91,53,93],warm);shadow=blend(shadow,[28,40,76],night*.75);
    return{hour:h,key,shadow,illumination:clamp(.18+day*.82+warm*.16),exposure:clamp(.76+day*.31+warm*.14-cloud*.12+frost*.03,.64,1.1),saturation:clamp(1.04-cloud*.2-night*.2+warm*.08-frost*.1,.62,1.15),contrast:clamp(1.06+day*.08+warm*.07-cloud*.09,.9,1.28),mood:night>.5?'dusk':cloud>.5?'cloudy':'golden'};
  }
  function forField(field){const o=field.options;if(o.colourDriver==='manual'||!o.adaptation)return null;
    const h=o.colourDriver==='recorded'?o.observedHour:o.studyHour;if(!Number.isFinite(h))return null;
    return derive({hour:h,rain:o.rain,humidity:o.humidity,sun:o.sun,temperature:o.temperature,frost:field.weather.frost});
  }
  function grade(manual,target,amount){if(!target)return{...manual};const out={...manual};for(const key of ['contrast','saturation','exposure'])out[key]=Math.round(mix(manual[key],target[key],clamp(amount))*1000)/1000;return out}
  return{derive,hour,forField,grade,blend};
})();
if(typeof window!=='undefined')window.SurfaceAdaptiveColour=SurfaceAdaptiveColour;
if(typeof module!=='undefined')module.exports=SurfaceAdaptiveColour;
