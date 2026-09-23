// Record actual PNG metadata and make the review archive with system zip.
// The images are copied unchanged from built-in ImageGen outputs.
import {readFileSync,writeFileSync,readdirSync,rmSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=dirname(fileURLToPath(import.meta.url));
const names=['00-field-kit-baseline','01-pocket-coast','02-sunlit-adventure','03-coastal-storybook','04-tideglass-tactics'];
const images=names.map(id=>{
  const file=`styles/${id}.png`,b=readFileSync(join(root,file));
  if(!b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('Invalid PNG: '+file);
  return {id,file,width:b.readUInt32BE(16),height:b.readUInt32BE(20),bytes:b.length,sha256:createHash('sha256').update(b).digest('hex'),role:id.startsWith('00-')?'existing-baseline':'new-style-concept',prompt:`prompts/${id}.txt`};
});
writeFileSync(join(root,'manifest.json'),JSON.stringify({version:2,title:'Four ways to Lacanau',generator:'Built-in ImageGen',artifactType:'art-direction concept boards',newDirections:4,nativeSprites:false,paletteValidated:false,images},null,2)+'\n');
const archive='lacanau-style-studies-v2.zip';
// This file is a rebuildable output owned by this script.
rmSync(join(root,archive),{force:true});
const files=readdirSync(root).filter(f=>!f.endsWith('.zip')&&f!=='.DS_Store');
execFileSync('zip',['-q','-r',archive,...files,'-x','*/.DS_Store'],{cwd:root});
execFileSync('unzip',['-tqq',archive],{cwd:root});
console.log(JSON.stringify({images:images.map(({id,width,height})=>({id,width,height})),archive,archiveBytes:readFileSync(join(root,archive)).length,integrity:'pass'},null,2));
