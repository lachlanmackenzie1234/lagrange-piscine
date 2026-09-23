export const ZONE_STYLES = {
  EC: { id: 'EC', colour: 'Orange', accent: '#cb793d', style: 'Timbered cottage', grass: 'Sunny meadow', floor: [[154,193,111],[132,179,96]], door: [85,92,16,25], doorShape: [[85,96],[100,93],[100,114],[85,117]], windows: [[[87,66],[97,65],[97,76],[87,78]],[[44,89],[50,87],[50,96],[44,98]]] },
  AG: { id: 'AG', colour: 'Green', accent: '#739149', style: 'Coastal veranda', grass: 'Coastal blades', floor: [[151,187,111],[129,174,92]], door: [73,84,17,27], doorShape: [[74,85],[89,87],[89,110],[74,108]], windows: [[[100,51],[110,49],[110,58],[100,60]],[[44,77],[56,80],[56,89],[44,86]]] },
  EP: { id: 'EP', colour: 'Teal', accent: '#3c9190', style: 'Gabled garden villa', grass: 'Clover lawn', floor: [[145,190,120],[123,177,104]], door: [66,92,16,25], doorShape: [[67,93],[81,96],[81,116],[67,113]], windows: [[[61,60],[70,61],[70,70],[61,69]],[[103,89],[109,91],[109,100],[103,98]]] },
  EPP: { id: 'EPP', colour: 'Violet', accent: '#9972b1', style: 'Twin-gable lodge', grass: 'Woodland flowers', floor: [[148,187,113],[126,172,95]], door: [62,93,16,24], doorShape: [[62,94],[78,98],[78,116],[62,112]], windows: [[[64,61],[69,62],[69,70],[64,69]],[[102,55],[110,53],[110,62],[102,64]]] },
  GP: { id: 'GP', colour: 'Blue', accent: '#5987be', style: 'Stone woodland cottage', grass: 'Forest fringe', floor: [[143,187,119],[122,173,105]], door: [65,94,13,24], doorShape: [[65,95],[77,98],[77,117],[65,114]], windows: [[[61,59],[70,61],[70,70],[61,68]],[[98,97],[105,99],[105,107],[98,105]]] },
};

export const TREE_SIZES = ['small', 'medium', 'large'];
// Saplings sit inside the garden; the mature fringe includes roots below the
// viewport. Keeping those roots large avoids empty edges when switching zones.
export const TREE_PLACEMENT_SIZES = ['medium','small','medium','medium','small','medium','medium','large','small','medium','medium','large','large','large'];

export function zoneStyle(gardenId) { return ZONE_STYLES[String(gardenId).split('-')[0]] || ZONE_STYLES.EC; }
export function grassStage(height) { return height < .3 ? 'cut' : height < .68 ? 'medium' : 'tall'; }

export const ZONE_ASSET_ROOT = 'assets/zone-kit/';
export function zoneAsset(zone, kind) { return `${ZONE_ASSET_ROOT}${kind === 'house' || kind === 'pump' ? 'houses-v2' : 'grass'}/${zone}-${kind}.png`; }
export function treeAsset(species, size) { return `${ZONE_ASSET_ROOT}trees/${species}-${size}.png`; }
