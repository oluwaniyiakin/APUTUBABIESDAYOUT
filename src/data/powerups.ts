/* ============================================================
   APUTU: Baby's Day Out — src/data/powerups.ts
   Power-up definitions. Each has a duration (seconds, 0 = instant
   charge-based effect), an emoji/color for its world pickup + HUD
   icon, and effect hooks the engine calls into (see
   src/core/powerup-system.ts).
   ============================================================ */

import type { PowerupType } from '../types';

export const POWERUP_TYPES: PowerupType[] = [
  {
    id: 'slow_time',
    name: 'Slow Time',
    emoji: '⏳',
    color: '#4A6FA5',
    duration: 6,
    rarity: 0.16,
    description: 'The whole street slows to half speed.',
  },
  {
    id: 'freeze_traffic',
    name: 'Freeze Traffic',
    emoji: '🧊',
    color: '#7FC8E8',
    duration: 5,
    rarity: 0.12,
    description: 'Vehicles freeze in place — walk right past.',
  },
  {
    id: 'guardian_angel',
    name: 'Guardian Angel',
    emoji: '😇',
    color: '#F5B942',
    duration: 0,
    rarity: 0.08,
    description: 'Absorbs your next missed hazard automatically.',
  },
  {
    id: 'double_coins',
    name: 'Double Coins',
    emoji: '🪙',
    color: '#E8963E',
    duration: 10,
    rarity: 0.18,
    description: 'Every hazard solved pays double coins.',
  },
  {
    id: 'shield',
    name: 'Shield',
    emoji: '🛡️',
    color: '#3F9C6B',
    duration: 0,
    rarity: 0.1,
    description: 'Blocks one failed hazard, then breaks.',
  },
  {
    id: 'safety_bubble',
    name: 'Safety Bubble',
    emoji: '🫧',
    color: '#9FD8E8',
    duration: 8,
    rarity: 0.1,
    description: 'Hazard fix windows are much larger.',
  },
  {
    id: 'super_nanny',
    name: 'Super Nanny',
    emoji: '🦸',
    color: '#D9364A',
    duration: 7,
    rarity: 0.06,
    description: 'Auto-solves any hazard the instant it spawns.',
  },
  {
    id: 'instant_bridge',
    name: 'Instant Bridge',
    emoji: '🌉',
    color: '#8C6A4F',
    duration: 0,
    rarity: 0.08,
    description: 'Instantly clears the next gutter/construction hazard.',
  },
  {
    id: 'magnet_coins',
    name: 'Magnet Coins',
    emoji: '🧲',
    color: '#5B3A8E',
    duration: 8,
    rarity: 0.12,
    description: 'Coins fly toward Aputu from farther away.',
  },
  {
    id: 'lucky_clover',
    name: 'Lucky Clover',
    emoji: '🍀',
    color: '#3F9C6B',
    duration: 12,
    rarity: 0.07,
    description: 'Slightly fewer hazards spawn while active.',
  },
  {
    id: 'extra_life',
    name: 'Extra Life',
    emoji: '❤️',
    color: '#F2637B',
    duration: 0,
    rarity: 0.05,
    description: 'One extra free save, saved for later.',
  },
];

export function pickRandomPowerup(): PowerupType {
  const total = POWERUP_TYPES.reduce((s, p) => s + p.rarity, 0);
  let r = Math.random() * total;
  for (const p of POWERUP_TYPES) {
    r -= p.rarity;
    if (r <= 0) return p;
  }
  return POWERUP_TYPES[0];
}

export function getPowerup(id: string): PowerupType | undefined {
  return POWERUP_TYPES.find(p => p.id === id);
}
