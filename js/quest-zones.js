/* Native coastal zone styles and continuous meadow, adapted from Pixel Lab v5.
 * Asset pixels and original native anchors are retained in assets/quest-zones/.
 */
const QuestZones = (() => {
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const seeded = seed => { let n=seed>>>0; return () => { n=(Math.imul(n,1664525)+1013904223)>>>0; return n/4294967296; }; };
const ZONE_STYLES = {
  EC: { id: 'EC', colour: 'Orange', accent: '#cb793d', style: 'Timbered cottage', grass: 'Sunny meadow', floor: [[154,193,111],[132,179,96]], door: [85,92,16,25], doorShape: [[85,96],[100,93],[100,114],[85,117]], windows: [[[87,66],[97,65],[97,76],[87,78]],[[44,89],[50,87],[50,96],[44,98]]] },
  AG: { id: 'AG', colour: 'Green', accent: '#739149', style: 'Coastal veranda', grass: 'Coastal blades', floor: [[151,187,111],[129,174,92]], door: [73,84,17,27], doorShape: [[74,85],[89,87],[89,110],[74,108]], windows: [[[100,51],[110,49],[110,58],[100,60]],[[44,77],[56,80],[56,89],[44,86]]] },
  EP: { id: 'EP', colour: 'Teal', accent: '#3c9190', style: 'Gabled garden villa', grass: 'Clover lawn', floor: [[145,190,120],[123,177,104]], door: [66,92,16,25], doorShape: [[67,93],[81,96],[81,116],[67,113]], windows: [[[61,60],[70,61],[70,70],[61,69]],[[103,89],[109,91],[109,100],[103,98]]] },
  EPP: { id: 'EPP', colour: 'Violet', accent: '#9972b1', style: 'Twin-gable lodge', grass: 'Woodland flowers', floor: [[148,187,113],[126,172,95]], door: [62,93,16,24], doorShape: [[62,94],[78,98],[78,116],[62,112]], windows: [[[64,61],[69,62],[69,70],[64,69]],[[102,55],[110,53],[110,62],[102,64]]] },
  GP: { id: 'GP', colour: 'Blue', accent: '#5987be', style: 'Stone woodland cottage', grass: 'Forest fringe', floor: [[143,187,119],[122,173,105]], door: [65,94,13,24], doorShape: [[65,95],[77,98],[77,117],[65,114]], windows: [[[61,59],[70,61],[70,70],[61,68]],[[98,97],[105,99],[105,107],[98,105]]] },
};

const TREE_SIZES = ['small', 'medium', 'large'];
// Saplings sit inside the garden; the mature fringe includes roots below the
// viewport. Keeping those roots large avoids empty edges when switching zones.
const TREE_PLACEMENT_SIZES = ['medium','small','medium','medium','small','medium','medium','large','small','medium','medium','large','large','large'];

function zoneStyle(gardenId) { return ZONE_STYLES[String(gardenId).split('-')[0]] || ZONE_STYLES.EC; }
function grassStage(height) { return height < .3 ? 'cut' : height < .68 ? 'medium' : 'tall'; }


// Six thin blades share each 8px cell. A 4×4 group is a repeatable 32px tile.
// Individual roots are masked at paths so a partial tile never fills a walkway.
const BLADE_ROOTS = [[-3,-3],[1,-3],[3,-1],[-1,0],[-3,3],[2,3]];
function createMeadow({ width, height, eligible, zoneAt = () => 'wild' }) {
  const cells = [];
  for (let y = 4; y < height; y += 8) for (let x = 4; x < width; x += 8) {
    let mask = 0;
    BLADE_ROOTS.forEach(([dx,dy], i) => { if (eligible(x+dx,y+dy)) mask |= 1 << i; });
    if (mask) cells.push({ x, y, mask, size: 1, variant: ((x-4)/8 + (y-4)/8*3) % 4, zone: zoneAt(x,y), bend: 0, bendVelocity: 0, flatten: 0 });
  }
  return cells;
}
function meadowHeight(growth, zone = 'wild', flatten = 0, maximum = 15) {
  const maintenance = zone === 'trimmed' ? .28 : zone === 'lawn' ? .75 : 1;
  return Math.max(1, Math.round((1 + (maximum-1) * clamp(growth,0,1)) * maintenance * (1 - clamp(flatten,0,1) * .3)));
}
function meadowShape(cell, { growth, lushness, time, wind, quiet, maximum = 15 }) {
  const gust = Math.sin(time * 1.3 + cell.x * .024 + cell.y * .013);
  return { height: meadowHeight(growth, cell.zone, cell.flatten, maximum), amount: clamp(Math.round(2 + lushness*.025 + growth*1.5),2,6),
    pose: quiet ? 0 : clamp(Math.round(gust * wind * 2 + (cell.bend || 0) * .6),-6,6), variant: cell.variant, mask: cell.mask };
}
function foregroundRoots(cell, footY) {
  return BLADE_ROOTS.reduce((mask, [,dy], i) => cell.mask & (1<<i) && cell.y+dy >= footY ? mask | (1<<i) : mask, 0);
}
function meadowPalette(theme, growth) {
  const [cut,tall] = theme.floor;
  const base = cut.map((channel,i) => Math.round(channel + (tall[i]-channel)*growth));
  const color = delta => `rgb(${base.map((v,i)=>clamp(v+delta[i],0,255)).join(',')})`;
  return { base: color([0,0,0]), root: color([-16,-19,-10]), blade: color([3,8,-1]), tip: color([21,24,9]), fleck: color([10,11,2]) };
}
function canvas(w,h) { const c=document.createElement('canvas');c.width=w;c.height=h;return c; }
function blade(g, x, y, h, pose, variant, index, palette) {
  const lean = pose + ((index + variant) % 3 - 1), tall = Math.max(1, Math.round(h * (.62 + ((index*3+variant)%5)*.095)));
  for (let dy = 0; dy < tall; dy++) {
    const dx = Math.round(lean * (dy/tall) ** 1.3);
    g.fillStyle = dy < 2 ? palette.root : dy >= tall-2 ? palette.tip : palette.blade;
    g.fillRect(x+dx,y-dy,1,1);
  }
}
function meadowSprite(shape, palette) {
  const c=canvas(24,28),g=c.getContext('2d');
  BLADE_ROOTS.forEach(([dx,dy],i) => {
    if (!(shape.mask & (1<<i)) || (i+shape.variant)%6 >= shape.amount) return;
    blade(g,12+dx,22+dy,shape.height,shape.pose,shape.variant,i,palette);
  });
  return c;
}
function meadowTile(theme, growth=1, withBlades=true) {
  const c=canvas(32,32),g=c.getContext('2d'),p=meadowPalette(theme,growth),r=seeded(831);
  g.fillStyle=p.base;g.fillRect(0,0,32,32);
  for(let i=0;i<28;i++){g.fillStyle=i%4?p.fleck:p.blade;g.fillRect(Math.floor(r()*32),Math.floor(r()*32),i%3?1:2,1);}
  if(withBlades) for(let y=4;y<32;y+=8) for(let x=4;x<32;x+=8) {
    const variant=((x-4)/8+(y-4)/8*3)%4;
    // Wrap the blade tips over both edges, keeping the square seamless.
    for(const ox of [-32,0,32]) for(const oy of [-32,0,32]) BLADE_ROOTS.forEach(([dx,dy],i)=>blade(g,x+dx+ox,y+dy+oy,meadowHeight(growth),0,variant,i,p));
  }
  return c;
}

// Native keeper: 64px source / 4 logical pixels, then ×2 into world space.
// The eight-pixel lower body is the safe foreground grass band.
const MAX_GRASS_HEIGHT = 8;
return { ZONE_STYLES, TREE_SIZES, TREE_PLACEMENT_SIZES, zoneStyle, grassStage, BLADE_ROOTS, createMeadow, meadowHeight, meadowShape, foregroundRoots, meadowPalette, meadowSprite, meadowTile, MAX_GRASS_HEIGHT };
})();
if (typeof window !== 'undefined') window.QuestZones = QuestZones;
if (typeof module !== 'undefined') module.exports = QuestZones;
