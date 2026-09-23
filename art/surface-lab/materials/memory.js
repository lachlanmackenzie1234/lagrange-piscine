/* Bounded latent scene state only. No canvases, sprites, storage or timers. */
const SurfaceMemory = (() => {
  function copy(value) {
    return { version:1, weather:{...value.weather,moisture:{...value.weather.moisture}}, wear:new Uint8Array(value.wear),
      time:value.time,step:value.step,sandOffset:{...value.sandOffset},earthOffset:{...value.earthOffset},hero:{...value.hero},weatherStamp:value.weatherStamp||null,weatherAt:value.weatherAt||null };
  }
  function size(value) { return value.wear.byteLength + new TextEncoder().encode(JSON.stringify({...value,wear:undefined})).byteLength; }
  class Cache {
    constructor({maxEntries=8,maxBytes=64*1024}={}) { this.maxEntries=maxEntries;this.maxBytes=maxBytes;this.entries=new Map();this.bytes=0; }
    remember(key,state) {
      const value=copy(state),bytes=size(value);if(bytes>this.maxBytes||this.maxEntries<1)return false;
      if(this.entries.has(key)){this.bytes-=this.entries.get(key).bytes;this.entries.delete(key)}
      while(this.entries.size>=this.maxEntries||this.bytes+bytes>this.maxBytes){const oldest=this.entries.keys().next().value;this.bytes-=this.entries.get(oldest).bytes;this.entries.delete(oldest)}
      this.entries.set(key,{value,bytes});this.bytes+=bytes;return true;
    }
    recall(key) { const entry=this.entries.get(key);if(!entry)return null;this.entries.delete(key);this.entries.set(key,entry);return copy(entry.value); }
    clear(){this.entries.clear();this.bytes=0}
    get stats(){return{entries:this.entries.size,bytes:this.bytes,maxEntries:this.maxEntries,maxBytes:this.maxBytes}}
  }
  return {Cache};
})();
if(typeof window!=='undefined')window.SurfaceMemory=SurfaceMemory;
if(typeof module!=='undefined')module.exports=SurfaceMemory;
