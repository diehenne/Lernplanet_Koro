import { walletHtml } from './coins';
import { ITEMS, inUse, moveItem } from '../core/shop';
import type { Bag, Profile } from '../core/types';
import { de } from '../i18n/de';

interface Base {
  root: HTMLElement;
  profile: Profile;
  save: () => void;
  onClose: () => void;
}

export interface InventorySpec extends Base {
  onEquip: (id: string | null) => void;
  onPlace: (id: string) => void;
  onOutfit: () => void;
}

export function openInventory(spec: InventorySpec): void {
  const p = spec.profile;
  const render = (): void => {
    const have = ITEMS.filter((i) => (p.inventory[i.id] ?? 0) > 0);
    const section = (kind: string, title: string): string => {
      const rows = have
        .filter((i) => i.kind === kind)
        .map((i) => {
          const n = p.inventory[i.id];
          let action = '';
          if (kind === 'tool') {
            const eq = p.tool === i.id;
            action = `<button data-a="${eq ? 'unequip' : 'equip'}" data-id="${i.id}">${eq ? de.inv.unequip : de.inv.equip}</button>`;
          } else if (kind === 'outfit') {
            const worn = p.outfit[i.slot!] === i.id;
            action = `<button data-a="${worn ? 'takeoff' : 'wear'}" data-id="${i.id}">${worn ? de.inv.takeOff : de.inv.wear}</button>`;
          } else if (kind === 'build') action = `<button data-a="place" data-id="${i.id}">${de.inv.place}</button>`;
          return `<div class="inv-row ${inUse(p, i.id) ? 'held' : ''}"><span class="e">${i.emoji}</span><span class="n">${i.name} ×${n}</span>${action}</div>`;
        })
        .join('');
      return rows ? `<h3>${title}</h3>${rows}` : '';
    };
    const body = section('tool', de.inv.tools) + section('outfit', de.inv.clothes) + section('build', de.inv.things) + section('material', de.inv.material);
    spec.root.innerHTML = `<div class="panel center inv"><h2>🎒 ${de.inv.title}</h2>
      <p class="wallet">${walletHtml(spec.profile)}</p>
      ${body || `<p>${de.inv.empty}</p>`}<p><small>${de.inv.hint}</small></p><button id="close">${de.close}</button></div>`;
    spec.root.querySelectorAll<HTMLElement>('.inv-row button').forEach((b) =>
      b.addEventListener('click', () => {
        const id = b.dataset.id!;
        if (b.dataset.a === 'equip') spec.onEquip(id);
        else if (b.dataset.a === 'unequip') spec.onEquip(null);
        else if (b.dataset.a === 'wear' || b.dataset.a === 'takeoff') {
          const slot = ITEMS.find((i) => i.id === id)!.slot!;
          if (b.dataset.a === 'wear') p.outfit[slot] = id;
          else delete p.outfit[slot];
          spec.onOutfit();
        }
        else {
          spec.root.innerHTML = '';
          spec.onClose();
          spec.onPlace(id);
          return;
        }
        spec.save();
        render();
      }),
    );
    document.getElementById('close')!.addEventListener('click', () => {
      spec.root.innerHTML = '';
      spec.onClose();
    });
  };
  render();
}

export interface ChestSpec extends Base {
  chestId: string;
}

/** Truhe: Dinge vom Rucksack in die Truhe legen und wieder herausnehmen. */
export function openChest(spec: ChestSpec): void {
  const p = spec.profile;
  const store: Bag = (p.chests[spec.chestId] ??= {});
  const list = (bag: Bag, dir: 'in' | 'out'): string => {
    const rows = ITEMS.filter((i) => (bag[i.id] ?? 0) > 0)
      .map(
        (i) => `<div class="inv-row"><span class="e">${i.emoji}</span><span class="n">${i.name} ×${bag[i.id]}</span>
          <button data-d="${dir}" data-id="${i.id}" data-n="1">${dir === 'in' ? '→' : '←'}</button>
          ${bag[i.id] > 1 ? `<button class="alt" data-d="${dir}" data-id="${i.id}" data-n="all">${dir === 'in' ? '⇒' : '⇐'}</button>` : ''}</div>`,
      )
      .join('');
    return rows || `<p class="empty-note">${de.chest.empty}</p>`;
  };
  const render = (): void => {
    spec.root.innerHTML = `<div class="panel center chest"><h2>🧰 ${de.chest.title}</h2>
      <div class="two"><div><h3>${de.chest.inBag}</h3>${list(p.inventory, 'in')}</div>
      <div><h3>${de.chest.inChest}</h3>${list(store, 'out')}</div></div><button id="close">${de.close}</button></div>`;
    spec.root.querySelectorAll<HTMLElement>('.inv-row button').forEach((b) =>
      b.addEventListener('click', () => {
        const id = b.dataset.id!;
        const [from, to] = b.dataset.d === 'in' ? [p.inventory, store] : [store, p.inventory];
        const n = b.dataset.n === 'all' ? from[id] : 1;
        // das Werkzeug in der Hand bleibt im Rucksack
        if (inUse(p, id) && b.dataset.d === 'in' && from[id] - n < inUse(p, id)) return;
        moveItem(from, to, id, n);
        spec.save();
        render();
      }),
    );
    document.getElementById('close')!.addEventListener('click', () => {
      spec.root.innerHTML = '';
      spec.onClose();
    });
  };
  render();
}
