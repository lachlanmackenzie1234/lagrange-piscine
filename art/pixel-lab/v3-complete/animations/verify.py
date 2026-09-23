#!/usr/bin/env python3
from pathlib import Path
from hashlib import sha256
from collections import Counter
import json
import subprocess
import sys
from PIL import Image
import numpy as np

root=Path(__file__).resolve().parent
m=json.loads((root/'manifest.json').read_text());clips=m['clips'];counts=Counter(c['category'] for c in clips.values())
expected={'character':180,'monster':50,'species':10,'pool-creature':46,'set-aura':10,'rarity-aura':12,'action-fx':7,'event-fx':11,'service-fx':5,'water':4,'loot':12}
assert dict(counts)==expected
assert m['clipCount']==len(clips)==347
assert len(m['auraGroups'])==11
total=0;moving=0;empty=0;seen=set()
sizes={'character':[24,32],'monster':[28,24],'species':[24,24],'pool-creature':[24,24],'set-aura':[48,48],'rarity-aura':[48,48],'action-fx':[64,64],'event-fx':[64,64],'service-fx':[64,64],'water':[16,16],'loot':[32,32]}
for id,c in clips.items():
    assert c['size']==sizes[c['category']],id
    assert sum(f['durationMs'] for f in c['frames'])==c['durationMs']
    assert c['durationMs']>0 and 0<=c['reducedMotionFrame']<len(c['frames'])
    ap=root/c['atlas'];assert sha256(ap.read_bytes()).hexdigest()==c['atlasSha256']
    atlas=Image.open(ap).convert('RGBA');hashes=set()
    assert atlas.size==(c['size'][0]*len(c['frames']),c['size'][1])
    for f in c['frames']:
        p=root/f['file'];assert p.resolve().is_relative_to(root)
        assert p.is_file() and str(p) not in seen;seen.add(str(p))
        assert sha256(p.read_bytes()).hexdigest()==f['sha256']
        with Image.open(p) as im:im.verify()
        im=Image.open(p).convert('RGBA');assert list(im.size)==c['size']
        a=np.array(im);assert np.all((a[:,:,3]==0)|(a[:,:,3]==255));assert np.all(a[a[:,:,3]==0]==0)
        assert (im.getbbox() is None)==f['empty']
        if f['empty']:empty+=1;assert not c['loop'],id
        x,y,w,h=f['sourceRect'];assert atlas.crop((x,y,x+w,y+h)).tobytes()==im.tobytes()
        assert f['durationMs']>=40
        hashes.add(sha256(im.tobytes()).hexdigest());total+=1
    assert len(hashes)>1,id+' has no visible changes'
    if id.endswith('/walk'):
        assert len(hashes)>=4,id;moving+=1
        first=Image.open(root/c['frames'][0]['file']).convert('RGBA')
        opposite=Image.open(root/c['frames'][5]['file']).convert('RGBA')
        assert first.crop((0,25,24,32)).tobytes()!=opposite.crop((0,25,24,32)).tobytes(),id+' feet do not articulate'
    if id.endswith('/spawn') and c['category'] in ('character','monster'):assert c['frames'][0]['empty'] and not c['frames'][-1]['empty']
    if id.endswith('/defeat'):assert not c['frames'][0]['empty'] and c['frames'][-1]['empty']
assert moving==20 and total==m['frameCount']==2028
for group,g in m['auraGroups'].items():
    assert clips[g['back']]['layer']=='back' and clips[g['front']]['layer']=='front'
    assert clips[g['back']]['durationMs']==clips[g['front']]['durationMs']
    assert clips[g['back']]['anchor']==clips[g['front']]['anchor']==[24,40]
assert set(m['combatTimelines'])=={'perche','balai','robot','choc','phm','floc','lavage'}
for t in m['combatTimelines'].values():
    assert t['effectClip'] in clips
    assert [e['atMs'] for e in t['events']]==sorted(e['atMs'] for e in t['events'])
    assert t['events'][-1]['atMs']==t['durationMs']

previews=json.loads((root/'previews/manifest.json').read_text())['previews']
assert len(previews)==10
for p in previews:
    with Image.open(root/p['file']) as im:
        assert im.n_frames==p['frames'] and im.n_frames>1
        durations=[];pixels=set()
        for i in range(im.n_frames):im.seek(i);durations.append(im.info.get('duration',0));pixels.add(sha256(im.convert('RGB').tobytes()).hexdigest())
        assert len(pixels)>1 and durations==p['frameDurationsMs'] and sum(durations)==p['durationMs']

runtime=subprocess.run(['node',str(root/'verify-runtime.mjs')],check=True,capture_output=True,text=True)
runtime_result=json.loads(runtime.stdout)
before=(root/'manifest.json').read_bytes()
subprocess.run([sys.executable,str(root/'build.py')],check=True,capture_output=True,text=True)
assert before==(root/'manifest.json').read_bytes(),'Animation rebuild changed its manifest'
report={'passed':True,'clips':len(clips),'frames':total,'counts':expected,'intentionalEmptyFrames':empty,'fourDirectionWalksChecked':moving,'animatedPreviews':len(previews),'binaryAlpha':True,'atlasFramesMatch':True,'sameInputsSameExports':True,'sourcePoseBoundsCheckedByGenerator':True,'runtime':runtime_result,'liveAppIntegration':False}
(root/'verification.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
