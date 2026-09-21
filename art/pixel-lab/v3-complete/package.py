#!/usr/bin/env python3
"""Package the complete export with its reproducible source and original artwork."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
from hashlib import sha256
import json

root=Path(__file__).resolve().parent
manifest=json.loads((root/'exports/manifest.json').read_text())
verification=json.loads((root/'qa/verification.json').read_text())
assert verification['passed'] and verification['assets']==manifest['assetCount']
for entry in manifest['assets']:
    path=root/'exports'/entry['file']
    assert path.is_file(),entry['id']
    assert sha256(path.read_bytes()).hexdigest()==entry['sha256'],entry['id']
animations=json.loads((root/'animations/manifest.json').read_text())
animation_check=json.loads((root/'animations/verification.json').read_text())
assert animation_check['passed'] and animation_check['frames']==animations['frameCount']
for clip in animations['clips'].values():
    assert sha256((root/'animations'/clip['atlas']).read_bytes()).hexdigest()==clip['atlasSha256']
    for frame in clip['frames']:
        assert sha256((root/'animations'/frame['file']).read_bytes()).hexdigest()==frame['sha256']
archive=root/'pocket-coast-v3-complete.zip'
files=sorted(p for p in root.rglob('*') if p.is_file() and p.suffix not in ('.zip','.pyc') and p.name!='.DS_Store' and '__pycache__' not in p.parts)
with ZipFile(archive,'w',compression=ZIP_DEFLATED,compresslevel=9) as z:
    for path in files:z.write(path,Path('pocket-coast-v3-complete')/path.relative_to(root))
with ZipFile(archive) as z:
    assert z.testzip() is None
    assert len(z.namelist())==len(files)
print(json.dumps({'archive':str(archive),'files':len(files),'bytes':archive.stat().st_size,'verifiedAssets':manifest['assetCount'],'animationClips':animations['clipCount'],'animationFrames':animations['frameCount'],'sha256':sha256(archive.read_bytes()).hexdigest()},indent=2))
