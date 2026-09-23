"""Render the same Web Audio scores/cues as the simulator, then encode MP3s.

Requires an already open agent-browser session on this simulator or sound library,
Node/agent-browser, and ffmpeg. Usage: python3 audio/export-assets.py --session NAME
No external sound samples or model/API calls are used.
"""
import argparse, base64, json, subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parent
def evaluate(session, code):
    result=subprocess.run(['npx','--yes','agent-browser','--session',session,'--json','eval','--stdin'],input=code,text=True,capture_output=True,check=True)
    response=json.loads(result.stdout)
    if not response['success']: raise RuntimeError(response)
    return response['data']['result']

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--session',required=True);args=parser.parse_args()
    catalogue=evaluate(args.session,"(async()=>{const c=await import('./audio/catalog.mjs');return {music:Object.keys(c.TRACKS),effects:Object.keys(c.CUES)};})()")
    manifest={'version':1,'provenance':'Original note scores and procedural synthesis; no third-party recordings or game music','assets':[]}
    for family, ids in catalogue.items():
        folder=ROOT/'exports'/family;folder.mkdir(parents=True,exist_ok=True)
        for identity in ids:
            code="""(async()=>{const {renderAsset,wavBytes}=await import('./audio/engine.mjs');
              const a=await renderAsset(KIND,ID),w=wavBytes(a);let peak=0,sum=0,count=0;
              for(const channel of a.channels)for(const value of channel){peak=Math.max(peak,Math.abs(value));sum+=value*value;count++;}
              let binary='';for(let i=0;i<w.length;i+=16384)binary+=String.fromCharCode(...w.subarray(i,i+16384));
              return {base64:btoa(binary),peak,rms:Math.sqrt(sum/count),duration:a.duration,sampleRate:a.sampleRate};})()""".replace('KIND',json.dumps('music' if family=='music' else 'effect')).replace('ID',json.dumps(identity))
            result=evaluate(args.session,code);wav=folder/f'{identity}.wav';wav.write_bytes(base64.b64decode(result.pop('base64')))
            if not (0<result['rms']<.5 and result['peak']<.98):raise ValueError((identity,result))
            file=wav
            if family=='music':
                file=folder/f'{identity}.mp3'
                subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-codec:a','libmp3lame','-b:a','96k',str(file)],check=True)
            manifest['assets'].append({'id':identity,'kind':family,'file':str(file.relative_to(ROOT/'exports')),'bytes':file.stat().st_size,**result})
            print(identity,round(result['duration'],2),'sec ·',file.stat().st_size,'bytes',flush=True)
    (ROOT/'exports'/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')

if __name__=='__main__':main()
