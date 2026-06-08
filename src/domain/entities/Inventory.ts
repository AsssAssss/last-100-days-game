export type Inventory = readonly string[];

export const INITIAL_INVENTORY: Inventory = ['一把生锈的小刀', '半瓶水', '半盒压缩饼干'];

export function addItems(inv: Inventory, items: readonly string[]): Inventory {
  return [...inv, ...items];
}

export function removeItems(inv: Inventory, items: readonly string[]): Inventory {
  const result = [...inv];
  for (const item of items) {
    const idx = result.indexOf(item);
    if (idx >= 0) result.splice(idx, 1);
  }
  return result;
}
