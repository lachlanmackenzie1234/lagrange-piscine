import { ZONE_STYLES, TREE_SIZES, ZONE_ASSET_ROOT } from './zone-art.mjs';
import { TREE_SPECIES, forestProfile } from './ecology.mjs';

const manifest = await fetch(`${ZONE_ASSET_ROOT}manifest.json`).then(r => { if (!r.ok) throw new Error('Asset manifest unavailable'); return r.json(); });
const asset = (identity, family, stage) => manifest.assets.find(a => a.identity === identity && a.family === family && a.stage === stage);
function sprite(item, label, zoom = 2) {
  const link = document.createElement('a'); link.href = ZONE_ASSET_ROOT + item.file; link.title = `${label} · ${item.size.join(' × ')} px`;
  const img = document.createElement('img'); img.src = link.href; img.alt = label; img.width = item.size[0]; img.height = item.size[1];
  img.style.width = `${item.size[0] * zoom}px`; img.style.height = `${item.size[1] * zoom}px`;
  link.append(img); return link;
}

for (const theme of Object.values(ZONE_STYLES)) {
  const ground=document.createElement('article');ground.className='zone-card ground-card';ground.style.setProperty('--accent',theme.accent);
  const title=document.createElement('h3');title.innerHTML=`<span>${theme.id}</span>${theme.colour}`;ground.append(title);
  const tiles=document.createElement('div');tiles.className='ground-stages';
  for(const stage of ['cut','medium','tall']){
    const item=asset(theme.id,'ground',stage),figure=document.createElement('figure'),link=document.createElement('a');
    link.href=ZONE_ASSET_ROOT+item.file;link.className='ground-swatch';link.style.backgroundImage=`url('${link.href}')`;link.setAttribute('aria-label',`${theme.id} ${stage} seamless grass tile`);
    const caption=document.createElement('figcaption');caption.textContent=stage;figure.append(link,caption);tiles.append(figure);
  }
  ground.append(tiles);document.getElementById('ground-cards').append(ground);
  const card = document.createElement('article'); card.className = 'zone-card'; card.style.setProperty('--accent', theme.accent);
  const heading = document.createElement('h3'); heading.innerHTML = `<span>${theme.id}</span>${theme.colour}`;
  const desc = document.createElement('p'); desc.textContent = theme.style;
  const buildings = document.createElement('div'); buildings.className = 'building-stage';
  buildings.append(sprite(asset(theme.id, 'houses', 'house'), `${theme.id} ${theme.style}`, 1.5), sprite(asset(theme.id, 'houses', 'pump'), `${theme.id} pump shelter`, 1.5));
  const grasses = document.createElement('div'); grasses.className = 'grass-stage';
  for (const stage of ['cut','medium','tall']) {
    const cell = document.createElement('figure'); cell.append(sprite(asset(theme.id, 'grass', stage), `${theme.id} ${stage} grass`, 2));
    const caption = document.createElement('figcaption'); caption.textContent = stage; cell.append(caption); grasses.append(cell);
  }
  const caption = document.createElement('p'); caption.className = 'zone-caption'; caption.textContent = `${theme.grass} · ${TREE_SPECIES[forestProfile(theme.id).dominant].plural}`;
  card.append(heading, desc, buildings, grasses, caption); document.getElementById('zone-cards').append(card);
}

for (const [id, meta] of Object.entries(TREE_SPECIES)) {
  const card = document.createElement('article'); card.className = 'tree-card';
  const heading = document.createElement('h3'); heading.textContent = meta.name; card.append(heading);
  const row = document.createElement('div'); row.className = 'tree-stage';
  for (const size of TREE_SIZES) {
    const item = asset(id, 'trees', size), figure = document.createElement('figure'); figure.append(sprite(item, `${size} ${meta.name}`, 2));
    const caption = document.createElement('figcaption'); caption.textContent = `${size} · ${item.size.join(' × ')}`; figure.append(caption); row.append(figure);
  }
  card.append(row); document.getElementById('tree-cards').append(card);
}
