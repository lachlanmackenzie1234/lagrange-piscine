// Original sketch scores. References inform the instrument palette and role,
// not the melodies: no recordings, samples or transcriptions from other games.
export const TRACKS = {
  garden: { title: 'A keeper’s morning', bpm: 84, bars: 8, mood: 'Warm plucks, soft bells, a slow walking bass.', colour: '#85a566',
    chords: [['G3','B3','D4'],['E3','G3','B3'],['C3','E3','G3'],['D3','F#3','A3'],['G3','B3','D4'],['C3','E3','G3'],['A2','C3','E3'],['D3','F#3','A3']],
    melody: [
      [[0,'D5',.75],[1,'B4',.5],[1.75,'A4',.25],[2,'G4',1],[3.25,'B4',.5]],
      [[.5,'E5',.5],[1.5,'D5',.5],[2.5,'B4',1]],
      [[0,'G4',.75],[1,'A4',.5],[2,'C5',.75],[3,'B4',.5]],
      [[0,'A4',1.25],[2,'F#4',.5],[3,'D5',.5]],
      [[0,'B4',.5],[.75,'D5',.5],[1.5,'G5',.75],[3,'E5',.5]],
      [[.5,'D5',.75],[1.5,'C5',.5],[2.5,'G4',1]],
      [[0,'A4',.5],[1,'C5',.5],[2,'E5',.75],[3,'D5',.5]],
      [[0,'A4',1],[1.5,'F#4',.5],[2.5,'G4',1]],
    ] },
  dusk: { title: 'After the last round', bpm: 68, bars: 8, mood: 'Spacious bell notes and a quiet, rounded accompaniment.', colour: '#9188b0',
    chords: [['F3','A3','C4'],['C3','E3','G3'],['D3','F3','A3'],['B♭2','D3','F3'],['F3','A3','C4'],['A2','C3','E3'],['B♭2','D3','F3'],['C3','E3','G3']],
    melody: [
      [[.5,'A4',1.5],[2.5,'G4',.5],[3.25,'C5',.5]],
      [[0,'E5',1],[2,'D5',.75],[3,'G4',.5]],
      [[.5,'A4',1],[2,'F4',1.5]],
      [[0,'D5',1.5],[2.5,'C5',1]],
      [[0,'A4',.75],[1,'C5',.75],[2.5,'F5',1]],
      [[.5,'E5',.75],[2,'C5',1]],
      [[0,'D5',.75],[1.5,'B♭4',1],[3,'A4',.5]],
      [[0,'G4',1.5],[2,'E4',.75],[3,'F4',.5]],
    ] },
  battle: { title: 'Trouble at the waterline', bpm: 116, bars: 8, mood: 'A playful pulse lead, quick arpeggios and little drum hits.', colour: '#c38a55',
    chords: [['E3','G3','B3'],['C3','E3','G3'],['A2','C3','E3'],['B2','D#3','F#3'],['E3','G3','B3'],['G2','B2','D3'],['A2','C3','E3'],['B2','D#3','F#3']],
    melody: [
      [[0,'E5',.4],[.5,'B4',.4],[1,'G5',.4],[1.5,'F#5',.4],[2,'E5',.65],[3,'B4',.4],[3.5,'D5',.4]],
      [[0,'E5',.4],[.75,'G5',.4],[1.5,'E5',.4],[2,'D5',.4],[2.5,'C5',.75]],
      [[0,'C5',.4],[.5,'E5',.4],[1,'A5',.6],[2,'G5',.4],[2.5,'E5',.4],[3,'C5',.6]],
      [[0,'D#5',.4],[.5,'F#5',.4],[1.5,'B5',.4],[2,'A5',.6],[3,'F#5',.6]],
      [[0,'G5',.4],[.5,'E5',.4],[1,'B4',.4],[1.5,'E5',.4],[2.5,'G5',.4],[3,'B5',.6]],
      [[0,'A5',.4],[.5,'G5',.4],[1.5,'D5',.6],[2.5,'B4',.6]],
      [[0,'C5',.4],[.5,'E5',.4],[1.5,'G5',.4],[2,'A5',.6],[3,'E5',.6]],
      [[0,'F#5',.4],[.5,'D#5',.4],[1,'B4',.6],[2,'D#5',.4],[3,'E5',.65]],
    ] },
};

export const CUES = {
  select: { title: 'A small discovery', group: 'Interface', description: 'A short, warm confirmation.', duration: .3 },
  'grass-step': { title: 'Feet in the grass', group: 'Garden', description: 'A light brush of dry blades.', duration: .15 },
  'stone-step': { title: 'Feet on the terrace', group: 'Garden', description: 'A soft, short footfall.', duration: .16 },
  rustle: { title: 'A canopy stirs', group: 'Garden', description: 'Leaves move around a branch.', duration: .65 },
  splash: { title: 'Poolside splash', group: 'Pool care', description: 'Water movement and a small bubble.', duration: .65 },
  door: { title: 'The depot door', group: 'Garden', description: 'A wooden catch and a low creak.', duration: .55 },
  pump: { title: 'Filter running', group: 'Pool care', description: 'A quiet motor and water through the pipes.', duration: 4 },
  hose: { title: 'Watering the border', group: 'Pool care', description: 'A gentle, broad spray.', duration: 3 },
  encounter: { title: 'Something in the grass', group: 'Encounter', description: 'A little questioning arpeggio.', duration: .8 },
  net: { title: 'Skimmer sweep', group: 'Encounter', description: 'A quick watery swish.', duration: .4 },
  brush: { title: 'Brush stroke', group: 'Encounter', description: 'Two brisk textured strokes.', duration: .4 },
  robot: { title: 'Robot wake-up', group: 'Encounter', description: 'A tiny electronic motor flourish.', duration: .6 },
  burst: { title: 'Treatment burst', group: 'Encounter', description: 'A fizzy splash with rising bubbles.', duration: .7 },
  hit: { title: 'A soft impact', group: 'Encounter', description: 'A rounded bump, never an explosion.', duration: .3 },
  win: { title: 'The garden settles', group: 'Encounter', description: 'An original, brief resolving phrase.', duration: 1.5 },
  lose: { title: 'Catch your breath', group: 'Encounter', description: 'A gentle downward answer.', duration: 1.25 },
};

export const AMBIENCES = {
  coast: { title: 'Quiet coast', description: 'A little wind, soft water and occasional birds.', wind: .2, water: .35, rain: 0, mood: 'day' },
  breeze: { title: 'Through the trees', description: 'More leaf movement, a livelier pool surface.', wind: .8, water: .7, rain: 0, mood: 'golden' },
  rain: { title: 'A passing shower', description: 'Filtered rain, low wind and rippling water.', wind: .4, water: .65, rain: .6, mood: 'day' },
  evening: { title: 'Garden after dark', description: 'A still pool, a softer wind and sparse crickets.', wind: .16, water: .25, rain: 0, mood: 'dusk' },
};

const SEMITONES = { C:0,D:2,E:4,F:5,G:7,A:9,B:11 };
export function frequency(note) {
  const match = /^([A-G])([#♭b]?)([0-8])$/.exec(note);
  if (!match) throw new Error(`Invalid note: ${note}`);
  const midi=(+match[3]+1)*12+SEMITONES[match[1]]+(match[2]==='#'?1:match[2]?-1:0);
  return 440*2**((midi-69)/12);
}
export function scoreFor(id) {
  const track=TRACKS[id]; if(!track)throw new Error(`Unknown score: ${id}`);
  const beat=60/track.bpm, events=[], fast=id==='battle', late=id==='dusk';
  const add=(b,n,d,instrument,gain,pan=0)=>events.push({time:b*beat,note:n,duration:d*beat,instrument,gain,pan});
  for(let bar=0;bar<track.bars;bar++){
    const start=bar*4,chord=track.chords[bar];
    for(const [offset,n,d] of track.melody[bar])add(start+offset,n,d,fast?'pulse':'bell',fast?.14:late?.15:.16,.05);
    add(start,chord[0],late?2.8:1.35,'bass',fast?.15:.12,-.07);
    if(!late)add(start+2,chord[2],1.2,'bass',.085,-.07);
    const rhythm=fast?[0,.5,1,1.5,2,2.5,3,3.5]:late?[.25,1.5,2.75]:[.5,1.5,2.5,3.5];
    rhythm.forEach((offset,i)=>add(start+offset,chord[(i+bar)%3],fast?.25:.8,'pluck',fast?.065:.055,i%2?.3:-.3));
    if(late)chord.forEach(n=>add(start,n,3.7,'pad',.023));
    if(fast){[0,2].forEach(offset=>add(start+offset,'C2',.14,'kick',.10));[1,3].forEach(offset=>add(start+offset,'C3',.09,'hat',.045));}
  }
  return { id, duration:track.bars*4*beat, events:events.sort((a,b)=>a.time-b.time) };
}

export function ambienceLevels({wind=0,water=0,rain=0,active=true}, battle=false) {
  const limit=v=>Math.max(0,Math.min(1,Number.isFinite(v)?v:0)), duck=battle?.3:1;
  return active ? {wind:(.018+limit(wind)*.12)*duck,water:(.01+limit(water)*.09)*duck,rain:limit(rain)*.17*duck} : {wind:0,water:0,rain:0};
}
