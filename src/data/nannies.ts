/* ============================================================
   APUTU: Baby's Day Out — src/data/nannies.ts
   Unlockable guardians. Each has a passive perk that mildly
   affects run mechanics, plus unique rescue lines used on the
   game-over screen.
   ============================================================ */

import type { Nanny } from '../types';

export const NANNIES: Nanny[] = [
  {
    id: 'nanny',
    name: 'Nanny',
    emoji: '🧑‍🍼',
    cost: 0,
    unlocked: true,
    perk: { type: 'none', label: 'The original guardian. No bonus, pure heart.' },
    rescueLines: [
      "Nanny scoops Aputu up just in time.",
      "\"Oh you little explorer!\" Nanny laughs.",
    ],
  },
  {
    id: 'grandma',
    name: 'Grandma',
    emoji: '👵',
    cost: 150,
    unlocked: false,
    perk: { type: 'extra_life', value: 1, label: "+1 free save per run — Grandma's reflexes are sharp." },
    rescueLines: [
      "Grandma shuffles over faster than you'd expect!",
      "\"Not on my watch,\" Grandma chuckles.",
    ],
  },
  {
    id: 'grandpa',
    name: 'Grandpa',
    emoji: '👴',
    cost: 150,
    unlocked: false,
    perk: { type: 'slow_start', value: 0.85, label: 'Hazards approach 15% slower for the first 20 seconds.' },
    rescueLines: [
      "Grandpa ambles in with surprising speed.",
      "\"Easy there, little one,\" Grandpa says warmly.",
    ],
  },
  {
    id: 'dad',
    name: 'Dad',
    emoji: '🧔',
    cost: 200,
    unlocked: false,
    perk: { type: 'coin_boost', value: 1.15, label: '+15% coins from every hazard solved.' },
    rescueLines: [
      "Dad sprints in, tie flapping in the wind.",
      "\"Gotcha, champ!\" Dad grins.",
    ],
  },
  {
    id: 'mom',
    name: 'Mom',
    emoji: '👩',
    cost: 200,
    unlocked: false,
    perk: { type: 'combo_grace', value: 1.5, label: 'Combo timer lasts 50% longer.' },
    rescueLines: [
      "Mom is there before you even see her move.",
      "\"My brave little wanderer,\" Mom smiles.",
    ],
  },
  {
    id: 'big-sister',
    name: 'Big Sister',
    emoji: '👧',
    cost: 250,
    unlocked: false,
    perk: { type: 'wider_window', value: 1.2, label: 'Hazard fix windows are 20% more forgiving.' },
    rescueLines: [
      "Big Sister slides in on her bicycle, just in time.",
      "\"Race you home!\" she teases Aputu.",
    ],
  },
  {
    id: 'robot-nanny',
    name: 'Robot Nanny',
    emoji: '🤖',
    cost: 400,
    unlocked: false,
    perk: { type: 'auto_solve', value: 1, label: 'Automatically solves 1 random hazard per run.' },
    rescueLines: [
      "ROBOT NANNY UNIT ACTIVATES RESCUE PROTOCOL.",
      "*beep boop* \"Safety... restored.\"",
    ],
  },
  {
    id: 'super-nanny',
    name: 'Super Nanny',
    emoji: '🦸‍♀️',
    cost: 600,
    unlocked: false,
    perk: { type: 'shield_start', value: 1, label: 'Every run starts with a free Shield power-up.' },
    rescueLines: [
      "Super Nanny swoops in with a cape-flourish!",
      "\"Justice — and juice boxes — for all!\"",
    ],
  },
  {
    id: 'village-chief',
    name: 'Village Chief',
    emoji: '🧑‍🦳',
    cost: 350,
    unlocked: false,
    perk: { type: 'community_watch', value: 1, label: 'Nearby hazards flash a warning 1 second earlier.' },
    rescueLines: [
      "The whole village seems to appear at once to help!",
      "\"We look after our own,\" the Chief says proudly.",
    ],
  },
  {
    id: 'teacher',
    name: 'Teacher',
    emoji: '🧑‍🏫',
    cost: 300,
    unlocked: false,
    perk: { type: 'xp_boost', value: 1.2, label: '+20% mission progress from every run.' },
    rescueLines: [
      "Teacher marks this as a valuable field lesson.",
      "\"Curiosity is good — safety is better,\" she says.",
    ],
  },
  {
    id: 'doctor',
    name: 'Doctor',
    emoji: '🧑‍⚕️',
    cost: 450,
    unlocked: false,
    perk: { type: 'extra_life', value: 2, label: '+2 free saves per run — always prepared.' },
    rescueLines: [
      "Doctor arrives with a calm, practiced hand.",
      "\"All better,\" the doctor says with a wink.",
    ],
  },
  {
    id: 'police-officer',
    name: 'Police Officer',
    emoji: '👮',
    cost: 350,
    unlocked: false,
    perk: { type: 'traffic_control', value: 1, label: 'Vehicles (car/bus/motorcycle) are 10% easier to solve.' },
    rescueLines: [
      "Officer blows the whistle and traffic freezes instantly.",
      "\"Safety first, little wanderer,\" the officer says.",
    ],
  },
  {
    id: 'firefighter',
    name: 'Firefighter',
    emoji: '🧑‍🚒',
    cost: 400,
    unlocked: false,
    perk: { type: 'hazard_immunity', value: 1, label: 'Immune to wire & construction hazards once per run.' },
    rescueLines: [
      "Firefighter slides down the pole — perfect timing!",
      "\"Rescue complete,\" they say with a salute.",
    ],
  },
];

export function getNanny(id: string): Nanny {
  return NANNIES.find(n => n.id === id) ?? NANNIES[0];
}
