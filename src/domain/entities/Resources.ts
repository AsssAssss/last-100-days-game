export const RESOURCE_KEYS = ['hp', 'sanity', 'food', 'water', 'ammo'] as const;
export type ResourceKey = (typeof RESOURCE_KEYS)[number];

export type Resources = Record<ResourceKey, number>;

export const MAX_RESOURCES: Resources = {
  hp: 100,
  sanity: 100,
  food: 100,
  water: 100,
  ammo: 100,
};

export const INITIAL_RESOURCES: Resources = {
  hp: 100,
  sanity: 80,
  food: 30,
  water: 30,
  ammo: 6,
};

export type ResourceDelta = Partial<Resources>;

export function applyDelta(current: Resources, delta: ResourceDelta): Resources {
  const result = { ...current };
  for (const key of RESOURCE_KEYS) {
    const change = delta[key];
    if (change === undefined) continue;
    const next = result[key] + change;
    result[key] = Math.max(0, Math.min(MAX_RESOURCES[key], next));
  }
  return result;
}

export function isDead(r: Resources): boolean {
  return r.hp <= 0 || r.sanity <= 0 || r.food <= 0 || r.water <= 0;
}

export function deathCause(r: Resources): ResourceKey | null {
  if (r.hp <= 0) return 'hp';
  if (r.sanity <= 0) return 'sanity';
  if (r.food <= 0) return 'food';
  if (r.water <= 0) return 'water';
  return null;
}
