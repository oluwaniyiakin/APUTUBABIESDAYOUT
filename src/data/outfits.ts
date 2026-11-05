/* ============================================================
   APUTU: Baby's Day Out — src/data/outfits.ts
   Cosmetic catalog used by both Customize and the Shop screen.
   Purchased outfits unlock permanently and become selectable
   in Customize.
   ============================================================ */

import type { ShopOutfit } from '../types';

export const SHOP_OUTFITS: ShopOutfit[] = [
  { id: 'ankara',      name: 'Ankara Romper',       cost: 0,   body: '#E8963E', accent: '#F2637B', starter: true },
  { id: 'explorer',    name: 'Explorer',            cost: 0,   body: '#8C6A4F', accent: '#3F9C6B', starter: true },
  { id: 'superhero',   name: 'Superhero',           cost: 0,   body: '#D9364A', accent: '#F5B942', starter: true },
  { id: 'astronaut',   name: 'Astronaut',           cost: 0,   body: '#D8D8D8', accent: '#4A6FA5', starter: true },
  { id: 'pirate',      name: 'Pirate',              cost: 0,   body: '#3A2A1E', accent: '#B22222', starter: true },
  { id: 'royal',       name: 'Tiny Royal',          cost: 0,   body: '#5B3A8E', accent: '#F5B942', starter: true },
  { id: 'robot',       name: 'Robot Baby',          cost: 200, body: '#B0B8C0', accent: '#4A6FA5' },
  { id: 'princess',    name: 'Princess',            cost: 250, body: '#F2A8C4', accent: '#F5B942' },
  { id: 'tinyking',    name: 'Tiny King',           cost: 300, body: '#5B3A8E', accent: '#D4AF37' },
  { id: 'tinyqueen',   name: 'Tiny Queen',          cost: 300, body: '#8E3A6B', accent: '#D4AF37' },
  { id: 'winter',      name: 'Winter Outfit',       cost: 180, body: '#E8F0F5', accent: '#4A6FA5' },
  { id: 'traditional', name: 'Traditional Attire',  cost: 220, body: '#C97324', accent: '#3F9C6B' },
  { id: 'safari',      name: 'Safari Explorer',     cost: 180, body: '#C4A876', accent: '#3A2A1E' },
  { id: 'festival',    name: 'Festival Sparkle',    cost: 260, body: '#F2637B', accent: '#F5B942' },
];

export function isOutfitUnlocked(id: string, ownedList: string[] | undefined): boolean {
  const outfit = SHOP_OUTFITS.find(o => o.id === id);
  if (!outfit) return false;
  if (outfit.starter) return true;
  return (ownedList ?? []).includes(id);
}
