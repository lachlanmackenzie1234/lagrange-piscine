import { clamp, seeded } from './engine.mjs';

// Six thin blades share each 8px cell. A 4×4 group is a repeatable 32px tile.
// Individual roots are masked at paths so a partial tile never fills a walkway.
export const BLADE_ROOTS = [[-3,-3],[1,-3],[3,-1],[-1,0],[-3,3],[2,3]];
export function createMeadow({ width, height, eligible, zoneAt = () => 'wild' }) {
  const cells = [];
  for (let y = 4; y < height; y += 8) for (let x = 4; x < width; x += 8) {
    let mask = 0;
    BLADE_ROOTS.forEach(([dx,dy], i) => { if (eligible(x+dx,y+dy)) mask |= 1 << i; });
    if (mask) cells.push({ x, y, mask, size: 1, variant: ((x-4)/8 + (y-4)/8*3) % 4, zone: zoneAt(x,y), bend: 0, bendVelocity: 0, flatten: 0 });
  }
  return cells;
}
export function meadowHeight(growth, zone = 'wild', flatten = 0, maximum = 15) {
  const maintenance = zone === 'trimmed' ? .28 : zone === 'lawn' ? .75 : 1;
  return Math.max(1, Math.round((1 + (maximum-1) * clamp(growth,0,1)) * maintenance * (1 - clamp(flatten,0,1) * .3)));
}
export function meadowShape(cell, { growth, lushness, time, wind, quiet, maximum = 15 }) {
  const gust = Math.sin(time * 1.3 + cell.x * .024 + cell.y * .013);
  return { height: meadowHeight(growth, cell.zone, cell.flatten, maximum), amount: clamp(Math.round(2 + lushness*.025 + growth*1.5),2,6),
    pose: quiet ? 0 : clamp(Math.round(gust * wind * 2 + (cell.bend || 0) * .6),-6,6), variant: cell.variant, mask: cell.mask };
}
export function foregroundRoots(cell, footY) {
  return BLADE_ROOTS.reduce((mask, [,dy], i) => cell.mask & (1<<i) && cell.y+dy >= footY ? mask | (1<<i) : mask, 0);
}
export function meadowPalette(theme, growth) {
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
export function meadowSprite(shape, palette) {
  const c=canvas(24,28),g=c.getContext('2d');
  BLADE_ROOTS.forEach(([dx,dy],i) => {
    if (!(shape.mask & (1<<i)) || (i+shape.variant)%6 >= shape.amount) return;
    blade(g,12+dx,22+dy,shape.height,shape.pose,shape.variant,i,palette);
  });
  return c;
}
export function meadowTile(theme, growth=1, withBlades=true) {
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
