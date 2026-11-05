/* ============================================================
   APUTU: Baby's Day Out — src/data/scrapbook.ts
   Nanny keeps a scrapbook of everything Aputu meets. Each entry
   unlocks the first time it happens and gives the world a bit of
   warmth and humour. Ids: hazard:<id>, world:<id>, moment:<id>.
   ============================================================ */

import type { ScrapbookEntry } from '../types';

export const SCRAPBOOK: ScrapbookEntry[] = [
  /* ----- hazards ----- */
  { id: 'hazard:car', kind: 'hazard', title: 'A Very Honky Car', caption: 'Aputu waved at it. The driver waved back, then honked, then sighed with relief.' },
  { id: 'hazard:motorcycle', kind: 'hazard', title: 'The Okada Rider', caption: 'Zoom! Aputu thinks every motorbike is a giant, loud bumblebee.' },
  { id: 'hazard:gutter', kind: 'hazard', title: 'The Great Gutter', caption: 'A very interesting hole. Nanny disagrees about the "interesting" part.' },
  { id: 'hazard:dog', kind: 'hazard', title: 'Sleepy Dog', caption: 'He was napping. Aputu wanted to share the nap. The dog wanted privacy.' },
  { id: 'hazard:cart', kind: 'hazard', title: 'Runaway Market Cart', caption: 'Piled with oranges. Aputu has opinions about oranges.' },
  { id: 'hazard:puddle', kind: 'hazard', title: 'The Puddle', caption: 'Splash! The best thing in the whole wide world, according to Aputu.' },
  { id: 'hazard:barrel', kind: 'hazard', title: 'Rolling Barrel', caption: 'It rolled. Aputu followed. Nobody asked either of them.' },
  { id: 'hazard:goat', kind: 'hazard', title: 'Grumpy Goat', caption: 'Baa-d mood. A carrot fixed everything, as carrots often do.' },
  { id: 'hazard:construction', kind: 'hazard', title: 'Orange Cones', caption: 'Aputu tried to wear one as a hat. It was a little big.' },
  { id: 'hazard:wire', kind: 'hazard', title: 'Buzzing Wire', caption: 'Zzzt! Switched off just in time. Thank you, whoever flipped that switch.' },
  { id: 'hazard:bus', kind: 'hazard', title: 'The Big Yellow Bus', caption: 'Beep beep! Aputu counted the wheels. He got to "many".' },
  { id: 'hazard:chicken', kind: 'hazard', title: 'Wild Chickens', caption: 'Bawk! A feather landed on Aputu\'s nose. Giggles all around.' },

  /* ----- worlds ----- */
  { id: 'world:residential', kind: 'world', title: 'Home Street', caption: 'Where it all began: one open front door and one very quiet toddler.' },
  { id: 'world:marketplace', kind: 'world', title: 'The Marketplace', caption: 'So many colours! Aputu tried to buy a tomato with a smile.' },
  { id: 'world:bus-stop', kind: 'world', title: 'The Bus Stop', caption: 'Everyone was waiting. Aputu was not.' },
  { id: 'world:construction-site', kind: 'world', title: 'Construction Site', caption: 'Hard hats are cool. Soft heads are cooler. Nanny disagrees.' },
  { id: 'world:playground', kind: 'world', title: 'The Playground', caption: 'Swings! Slides! A very patient seesaw.' },
  { id: 'world:school-road', kind: 'world', title: 'School Road', caption: 'Aputu saluted the crossing guard. The guard saluted right back.' },
  { id: 'world:river-crossing', kind: 'world', title: 'River Crossing', caption: 'A wooden bridge, a lazy boat, and a very long way across.' },
  { id: 'world:village-road', kind: 'world', title: 'Village Road', caption: 'Dust, goats, and an auntie who insisted on feeding him.' },
  { id: 'world:city-center', kind: 'world', title: 'City Center', caption: 'Tall buildings. Tiny crawler. Big attitude.' },
  { id: 'world:park', kind: 'world', title: 'The Park', caption: 'Ducks! Aputu asked every single one for an autograph.' },
  { id: 'world:farm-road', kind: 'world', title: 'Farm Road', caption: 'Moo. Baa. Cluck. Aputu answered all of them.' },
  { id: 'world:bridge', kind: 'world', title: 'The Big Bridge', caption: 'Long, windy and a little bit magical.' },
  { id: 'world:festival-street', kind: 'world', title: 'Festival Street', caption: 'Drums! Aputu clapped off-beat and nobody minded.' },
  { id: 'world:night-market', kind: 'world', title: 'Night Market', caption: 'Lanterns and the smell of roasting corn. Past bedtime, but worth it.' },
  { id: 'world:industrial-zone', kind: 'world', title: 'Industrial Zone', caption: 'Honestly, the least baby-friendly place in town. Aputu made it anyway.' },

  /* ----- moments ----- */
  { id: 'moment:flower', kind: 'moment', title: 'Stop and Smell the Flowers', caption: 'Aputu paused to sniff a flower. Then sneezed. Then did it again.' },
  { id: 'moment:butterfly', kind: 'moment', title: 'The Butterfly Chase', caption: 'He never caught it. He never stopped trying.' },
  { id: 'moment:balloon', kind: 'moment', title: 'A Red Balloon', caption: 'Reaching, reaching, reaching... and a very proud little "ooh!"' },
  { id: 'moment:cat', kind: 'moment', title: 'A New Friend', caption: 'One gentle pat. One happy purr. Best friends forever.' },
];

export function getScrapbookEntry(id: string): ScrapbookEntry | undefined {
  return SCRAPBOOK.find(e => e.id === id);
}
