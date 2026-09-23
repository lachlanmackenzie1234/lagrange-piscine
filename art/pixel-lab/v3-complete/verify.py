#!/usr/bin/env python3
"""Check catalog coverage, native alpha, source crops, atlas frames and seed behaviour."""
from pathlib import Path
from collections import Counter
from hashlib import sha256
import json
import sys
import subprocess
from PIL import Image
import numpy as np

ROOT=Path(__file__).resolve().parent;OUT=ROOT/'exports'
sys.path.insert(0,str(ROOT/'sources'))
from pixel_export import cosmetic_variant,avatar_variant,equipment_variant,sha,DIRECTIONS

m=json.loads((OUT/'manifest.json').read_text());catalog=json.loads((ROOT/'catalog.json').read_text());pools=json.loads((ROOT/'pools.json').read_text())
assert m['status']=='complete-static-catalog'
expected={'equipment-base':40,'equipment-seeded':40,'equipment':240,'equipment-cursed':200,'characters':20,'species':5,'pool-creatures':23,'monsters-base':10,'monster-tiers':60,'pool-monsters':230,'avatar-presets':40,'resources':10,'utilities':10,'crates':6,'actions':7,'atlas':23,'maps':23,'environments':2}
assert m['counts']==expected,(m['counts'],expected)
assert m['assetCount']==sum(expected.values())==len(m['assets'])
entries={e['id']:e for e in m['assets']};assert len(entries)==len(m['assets'])
sizes={'equipment-base':(16,16),'equipment-seeded':(16,16),'equipment':(16,16),'equipment-cursed':(16,16),'characters':(24,32),'species':(24,24),'pool-creatures':(24,24),'monsters-base':(28,24),'monster-tiers':(28,24),'pool-monsters':(28,24),'avatar-presets':(24,32),'resources':(16,16),'utilities':(16,16),'crates':(16,16),'actions':(16,16),'maps':(256,192),'environments':(256,192)}
images={};colour_max={}
for e in m['assets']:
    p=(OUT/e['file']).resolve();assert p.is_relative_to(ROOT)
    assert p.is_file(),e['id']
    assert sha256(p.read_bytes()).hexdigest()==e['sha256'],e['id']
    with Image.open(p) as im:im.verify()
    im=Image.open(p).convert('RGBA');images[e['id']]=im
    assert im.size==(e['width'],e['height'])
    if e['category'] in sizes:assert im.size==sizes[e['category']],e['id']
    assert sha(im)==e['pixelSha256'],e['id']
    histogram=im.getchannel('A').histogram()
    assert histogram[255]>0,e['id']
    assert sum(histogram[1:255])==0,e['id']
    if e['category'] not in ('maps','atlas','environments'):assert histogram[0]>0,e['id']
    arr=np.array(im);opaque=arr[:,:,3]==255
    assert np.all(arr[~opaque]==0),e['id']
    if e['category'] not in ('maps','atlas','environments'):
        count=len(np.unique(arr[opaque,:3],axis=0));colour_max[e['category']]=max(count,colour_max.get(e['category'],0));assert count<=40,(e['id'],count)
    if 'large' in e:assert (OUT/e['large']).is_file(),e['id']
    if 'base' in e:assert e['base'] in entries,e['id']

frames_checked=0
for e in m['assets']:
    if e['category']!='atlas':continue
    bounds=[]
    for f in e['frames']:
        assert f['id'] in entries
        x,y,w,h=f['x'],f['y'],f['width'],f['height'];assert 0<=x<x+w<=e['width'] and 0<=y<y+h<=e['height']
        box=(x,y,x+w,y+h);assert box not in bounds;bounds.append(box)
        assert images[e['id']].crop(box).tobytes()==images[f['id']].tobytes(),(e['id'],f['id'])
        frames_checked+=1

for s in catalog['sets']:
    for slot in ['head','body','legs','feet','charm','pole','robot','brush']:
        rarities=[s['id']+'-'+slot+'-'+r['id'] for r in catalog['rarities']]
        assert len({entries[id]['pixelSha256'] for id in rarities})==6
        assert s['id']+'-'+slot+'-common-cursed' not in entries
for e in m['assets']:
    if e['category']=='equipment-cursed':assert e['rarity']!='common' and e['cursed']
for p in pools:
    assert 'creature-'+p['id'] in entries and 'map-'+p['id'] in entries
    assert entries['creature-'+p['id']]['set']==p['res']
    for monster in catalog['monsters']:assert p['id']+'-'+monster['id'] in entries

seed_checks=0
for e in m['assets']:
    if e['category'] not in ('pool-creatures','pool-monsters','avatar-presets','equipment-seeded'):continue
    v=e['variation'];base=images[e['base']]
    if e['category']=='avatar-presets':regenerated,meta=avatar_variant(base,v['identity'],v['revision'])
    elif e['category']=='equipment-seeded':regenerated,meta=equipment_variant(base,v['identity'],v['rarity'],v['revision'],v['cursed'])
    else:regenerated,meta=cosmetic_variant(base,v['identity'],v['revision'],v['namespace'])
    assert regenerated.tobytes()==images[e['id']].tobytes(),e['id']
    assert meta==v,e['id'];seed_checks+=1
assert len({e['pixelSha256'] for e in m['assets'] if e['category']=='pool-creatures'})==23
assert len({e['pixelSha256'] for e in m['assets'] if e['category']=='pool-monsters'})==230
for p in pools:
    base=images['species-'+p['res']]
    a,_=cosmetic_variant(base,p['id'],0);b,_=cosmetic_variant(base,p['id'],1)
    assert a.tobytes()!=b.tobytes(),'Reroll had no effect for '+p['id']
    assert np.array_equal(np.array(a)[:,:,3],np.array(base)[:,:,3]),'Seed changed creature silhouette'

# Check actual crop edges against the high-alpha source, not the rectangular grid assumption.
source_cache={};crop_count=0
for id,s in json.loads((ROOT/'sources/extraction-manifest.json').read_text()).items():
    if s['sheet'] not in source_cache:source_cache[s['sheet']]=np.array(Image.open(ROOT/s['sheet']).convert('RGBA'))[:,:,3]>=128
    a=source_cache[s['sheet']];x0,y0,x1,y1=s['cell'];height,width=a.shape
    assert 0<=x0<x1<=width and 0<=y0<y1<=height
    crosses=[]
    if x0>0:crosses.append(np.logical_and(a[y0:y1,x0],a[y0:y1,x0-1]).sum())
    if x1<width:crosses.append(np.logical_and(a[y0:y1,x1-1],a[y0:y1,x1]).sum())
    if y0>0:crosses.append(np.logical_and(a[y0,x0:x1],a[y0-1,x0:x1]).sum())
    if y1<height:crosses.append(np.logical_and(a[y1-1,x0:x1],a[y1,x0:x1]).sum())
    assert max(crosses,default=0)==0,('Source sprite cut through solid pixels',id,crosses)
    crop_count+=1

# A whole rebuild should reproduce the source-derived pixels, atlas metadata and seeds.
before=(OUT/'manifest.json').read_bytes()
subprocess.run([sys.executable,str(ROOT/'build.py'),'--revision',str(m['revision'])],check=True,capture_output=True,text=True)
assert before==(OUT/'manifest.json').read_bytes(),'Rebuild changed the manifest'
report={'passed':True,'assets':len(m['assets']),'counts':expected,'checkedAtlasFrames':frames_checked,'checkedSourceCrops':crop_count,'checkedSeededViews':seed_checks,'maxNativeColoursByCategory':colour_max,'dimensionsValid':True,'binaryAlpha':True,'noEmptySprites':True,'noSourceBoundaryClipping':True,'allCatalogEntriesCovered':True,'allAtlasFramesMatchAssets':True,'seedSilhouettesPreserved':True,'allPoolCreaturesDistinct':True,'allPoolMonstersDistinct':True,'byteIdenticalRebuild':True,'animationsIncluded':False}
(ROOT/'qa/verification.json').write_text(json.dumps(report,indent=2)+'\n')
report['staticCatalogOnly']=True
report['separateAnimationVerification']='../animations/verification.json'
(ROOT/'qa/verification.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
