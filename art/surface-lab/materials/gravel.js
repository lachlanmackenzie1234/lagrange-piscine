/* Coarse mineral colour grains, with friction-limited contact movement. */
const SurfaceGravel=(()=>{
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
 function sample(x,y,wet=0,scale=1){return SurfaceGrain.sample('gravel',x,y,wet,scale)}
 function response(age,recovery=8){const t=clamp(age/recovery),settle=1-t*t*(3-2*t);return{settle,lift:Math.sin(clamp(age/.35)*Math.PI),push:1-Math.exp(-Math.max(0,age)*12)}}
 function paintContact(g,p,age,recovery,shade,scale=1,wet=0){SurfaceGrain.paintContact(g,p,'gravel',age,wet,recovery,shade,scale)}
 return{sample,response,paintContact};
})();
if(typeof window!=='undefined')window.SurfaceGravel=SurfaceGravel;
if(typeof module!=='undefined')module.exports=SurfaceGravel;
