import { sfx } from './sfx';
import { COINS, EXCHANGES, addCoins, balance, canExchange, changeDue, earn, moneyChoices, sellBatch, spendCoins } from '../core/money';
import { ITEMS, addItem, inUse, itemById, sellPrice, takeItem } from '../core/shop';
import type { Profile } from '../core/types';
import { de } from '../i18n/de';
import { coinChips, walletHtml } from './coins';
import { speak } from './speech';

export interface TradeSpec {
  root: HTMLElement;
  profile: Profile;
  save: () => void;
  onChange: () => void;
  onClose: () => void;
}

const GEM = '<span class="gem"></span>';
const sum = (a: number[]): number => a.reduce((x, y) => x + y, 0);

/** Händler: Kaufen mit Münzen auf dem Tisch (inkl. Wechselgeld-Rechnung) und Verkaufen (Mal-Rechnung). */
export function openTrade(spec: TradeSpec): void {
  const p = spec.profile;
  const root = spec.root;
  let mode: 'buy' | 'sell' | 'swap' = 'buy';
  let msg = '';

  const frame = (body: string): void => {
    root.innerHTML = `<div class="panel center trade"><h2>🧺 ${de.trade.title}</h2>
      <p><span class="chip" id="trade-rupees">${GEM} ${balance(p)}</span></p>
      <p class="wallet"><small>${de.trade.coinsOwned}:</small> ${walletHtml(p)}</p>
      ${body}<p class="msg">${msg}</p></div>`;
    root.querySelectorAll<HTMLElement>('button').forEach((b) => b.addEventListener('mousedown', (e) => e.preventDefault()));
  };
  const close = (): void => {
    root.innerHTML = '';
    spec.onClose();
  };
  const say = (text: string, shown = text): void => {
    msg = shown;
    void speak(text);
  };

  // Auf kleinen Bildschirmen blättern statt scrollen
  let page = 0;
  const PER = 6;
  const small = (): boolean => innerHeight <= 520 || innerWidth <= 600;
  const pager = (rows: string[]): string => {
    if (!small() || rows.length <= PER) { page = 0; return `<div class="goods">${rows.join('')}</div>`; }
    const pages = Math.ceil(rows.length / PER);
    page = Math.min(page, pages - 1);
    return `<div class="goods">${rows.slice(page * PER, page * PER + PER).join('')}</div>
      <div class="pager"><button class="alt" id="pg-prev" ${page === 0 ? 'disabled' : ''}>◀</button><span>${page + 1}/${pages}</span><button class="alt" id="pg-next" ${page >= pages - 1 ? 'disabled' : ''}>▶</button></div>`;
  };
  const bindPager = (again: () => void): void => {
    document.getElementById('pg-prev')?.addEventListener('click', () => { page--; again(); });
    document.getElementById('pg-next')?.addEventListener('click', () => { page++; again(); });
  };

  const tabs = (): string =>
    `<div class="tabs"><button class="${mode === 'buy' ? '' : 'alt'}" id="t-buy">${de.trade.buy}</button>
     <button class="${mode === 'sell' ? '' : 'alt'}" id="t-sell">${de.trade.sell}</button>
     <button class="${mode === 'swap' ? '' : 'alt'}" id="t-swap">${de.trade.swap}</button></div>`;
  const bindTabs = (): void => {
    document.getElementById('t-buy')!.addEventListener('click', () => { mode = 'buy'; msg = ''; page = 0; pickBuy(); });
    document.getElementById('t-sell')!.addEventListener('click', () => { mode = 'sell'; msg = ''; page = 0; pickSell(); });
    document.getElementById('t-swap')!.addEventListener('click', () => { mode = 'swap'; msg = ''; page = 0; pickSwap(); });
  };

  // ------------------------------------------------------------ Kaufen

  const pickBuy = (): void => {
    const rows = ITEMS.filter((i) => i.stock)
      .map((i) => `<button class="row ${balance(p) < i.price ? 'poor' : ''}" data-id="${i.id}"><span class="e">${i.emoji}</span><span class="n">${i.name}</span><span>${GEM} ${i.price}</span></button>`);
    frame(`${tabs()}<p><small>${de.trade.pickItem}</small></p>${pager(rows)}<button class="alt" id="close">${de.close}</button>`);
    bindTabs();
    bindPager(pickBuy);
    document.getElementById('close')!.addEventListener('click', close);
    root.querySelectorAll<HTMLElement>('.goods button').forEach((b) =>
      b.addEventListener('click', () => {
        const item = itemById(b.dataset.id!);
        if (balance(p) < item.price) {
          say(de.tradeNotEnough, `${de.trade.notEnough} (${GEM} ${item.price})`);
          return pickBuy();
        }
        msg = '';
        lay(item.id, []);
        void speak(`${de.tradePrice(item.price)} ${de.tradeLay}`);
      }),
    );
  };

  const lay = (id: string, laid: number[]): void => {
    const item = itemById(id);
    const total = sum(laid);
    const enough = total >= item.price;
    const coins = COINS.map((c) => {
      const left = (p.coins[c] ?? 0) - laid.filter((x) => x === c).length;
      return `<button class="coin c${c}" data-c="${c}" ${!enough && left > 0 ? '' : 'disabled'}>${c}<i>×${left}</i></button>`;
    }).join('');
    const table = laid.map((c) => `<span class="coin small c${c}">${c}</span>`).join('') || '<span class="empty">…</span>';
    frame(`<div class="buying"><span class="e big">${item.emoji}</span> <b>${item.name}</b> · ${de.trade.price}: ${GEM} <b>${item.price}</b></div>
      <div class="table"><small>${de.trade.table}</small><div class="laid">${table}</div><p class="total">${GEM} ${total}</p></div>
      <p><small>${de.trade.yourCoins}</small></p><div class="coins">${coins}</div>
      <div><button class="alt" id="clear">↩ ${de.trade.back}</button>
      <button id="pay" ${enough ? '' : 'disabled'}>✓ ${de.trade.buy}</button></div>`);
    root.querySelectorAll<HTMLElement>('.coins button').forEach((b) =>
      b.addEventListener('click', () => lay(id, [...laid, Number(b.dataset.c)])),
    );
    document.getElementById('clear')!.addEventListener('click', () => { msg = ''; pickBuy(); });
    document.getElementById('pay')!.addEventListener('click', () => {
      if (!enough) return;
      const due = changeDue(total, item.price);
      if (due === 0) return complete(id, laid, 0);
      askChange(id, laid, due);
    });
  };

  const askChange = (id: string, laid: number[], due: number): void => {
    const item = itemById(id);
    const given = sum(laid);
    let tried = false;
    const choices = moneyChoices(due, 'sub', given, item.price);
    frame(`<p>${de.tradeGave(given).replace(/(\d+)/, `${GEM} <b>$1</b>`)}</p><p>${de.trade.price}: ${GEM} <b>${item.price}</b></p>
      <p><b>${de.tradeChangeQ}</b></p><div class="task-big">${given} − ${item.price} = ?</div>
      <div class="choices">${choices.map((c) => `<button data-v="${c}">${c}</button>`).join('')}</div><div class="hint hidden"></div>`);
    void speak(`${de.tradeGave(given)} ${de.tradeChangeQ}`);
    const hint = root.querySelector<HTMLElement>('.hint')!;
    root.querySelectorAll<HTMLElement>('.choices button').forEach((b) =>
      b.addEventListener('click', () => {
        if (b.classList.contains('wrong')) return;
        if (Number(b.dataset.v) === due) {
          b.classList.add('right');
          setTimeout(() => complete(id, laid, due), 700);
          return;
        }
        b.classList.add('wrong');
        if (!tried) {
          tried = true;
          hint.classList.remove('hidden');
          hint.innerHTML = `<p>🌱 ${de.tryAgain}</p><p>${de.tradeChangeHint(given, item.price)}</p>`;
          void speak(`${de.tryAgain} ${de.tradeChangeHint(given, item.price)}`);
        } else void speak(de.tryAgainShort);
      }),
    );
  };

  const complete = (id: string, laid: number[], due: number): void => {
    if (!spendCoins(p, laid)) return pickBuy();
    earn(p, due);
    sfx('buy');
    addItem(p.inventory, id);
    spec.save();
    spec.onChange();
    msg = '';
    pickBuy();
    const text = due > 0 ? `${de.tradeChangeOk(due)} ${de.tradeThanks}` : `${de.tradeExact} ${de.tradeThanks}`;
    say(text, due > 0 ? `${de.tradeChangeOk(due)} ${de.tradeThanks}` : text);
    document.querySelector('.trade .msg')!.textContent = msg;
  };

  // ------------------------------------------------------------ Verkaufen

  const pickSell = (): void => {
    const rows = ITEMS.filter((i) => (p.inventory[i.id] ?? 0) - inUse(p, i.id) > 0)
      .map((i) => {
        const have = (p.inventory[i.id] ?? 0) - inUse(p, i.id);
        return `<button class="row" data-id="${i.id}"><span class="e">${i.emoji}</span><span class="n">${i.name} ×${have}</span><span>${de.trade.unit} ${GEM} ${sellPrice(i.id)}</span></button>`;
      });
    frame(`${tabs()}<p><small>${rows.length ? de.trade.pickSell : de.trade.nothingToSell}</small></p>${pager(rows)}<button class="alt" id="close">${de.close}</button>`);
    bindTabs();
    bindPager(pickSell);
    document.getElementById('close')!.addEventListener('click', close);
    root.querySelectorAll<HTMLElement>('.goods button').forEach((b) =>
      b.addEventListener('click', () => {
        const id = b.dataset.id!;
        const have = (p.inventory[id] ?? 0) - inUse(p, id);
        const unit = sellPrice(id);
        const n = sellBatch(have, unit);
        if (n === 1) return doSell(id, 1, unit);
        askSell(id, n, unit);
      }),
    );
  };

  const askSell = (id: string, n: number, unit: number): void => {
    const item = itemById(id);
    const total = n * unit;
    let tried = false;
    frame(`<div class="buying"><span class="e big">${item.emoji}</span> ${n} ${de.trade.unit} ${GEM} <b>${unit}</b></div>
      <div class="task-big">${n} × ${unit} = ?</div>
      <div class="choices">${moneyChoices(total, 'mul', n, unit).map((c) => `<button data-v="${c}">${c}</button>`).join('')}</div><div class="hint hidden"></div>`);
    void speak(de.sellQ(n, unit));
    const hint = root.querySelector<HTMLElement>('.hint')!;
    root.querySelectorAll<HTMLElement>('.choices button').forEach((b) =>
      b.addEventListener('click', () => {
        if (b.classList.contains('wrong')) return;
        if (Number(b.dataset.v) === total) {
          b.classList.add('right');
          setTimeout(() => doSell(id, n, unit), 700);
          return;
        }
        b.classList.add('wrong');
        if (!tried) {
          tried = true;
          hint.classList.remove('hidden');
          hint.innerHTML = `<p>🌱 ${de.tryAgain}</p><p>${de.sellHint(n, unit)}</p>`;
          void speak(`${de.tryAgain} ${de.sellHint(n, unit)}`);
        } else void speak(de.tryAgainShort);
      }),
    );
  };

  const doSell = (id: string, n: number, unit: number): void => {
    if (!takeItem(p.inventory, id, n)) return pickSell();
    earn(p, n * unit);
    spec.save();
    spec.onChange();
    pickSell();
    say(de.sellOk(n * unit), de.sellOk(n * unit));
    document.querySelector('.trade .msg')!.textContent = msg;
  };

  // ------------------------------------------------------------ Wechseln

  const pickSwap = (): void => {
    const down = EXCHANGES.filter((e) => canExchange(p, [e.from]));
    const up = EXCHANGES.filter((e) => canExchange(p, e.to));
    const row = (give: number[], get: number[], dir: string): string =>
      `<button class="row swap" data-g="${give.join(',')}" data-t="${get.join(',')}"><span class="n">${coinChips(give)}</span><span>➜</span><span class="n">${coinChips(get)}</span></button>`;
    const rows = [...down.map((e) => row([e.from], e.to, 'down')), ...up.map((e) => row(e.to, [e.from], 'up'))];
    frame(`${tabs()}<p><small>${rows.length ? de.trade.swapHint : de.trade.nothingToSwap}</small></p>${pager(rows)}<button class="alt" id="close">${de.close}</button>`);
    bindTabs();
    bindPager(pickSwap);
    document.getElementById('close')!.addEventListener('click', close);
    root.querySelectorAll<HTMLElement>('.goods button').forEach((b) =>
      b.addEventListener('click', () => {
        const give = b.dataset.g!.split(',').map(Number);
        const get = b.dataset.t!.split(',').map(Number);
        if (!spendCoins(p, give)) return pickSwap();
        sfx('coin');
        addCoins(p.coins, get);
        spec.save();
        spec.onChange();
        pickSwap();
        say(de.tradeSwapped);
        document.querySelector('.trade .msg')!.textContent = de.tradeSwapped;
      }),
    );
  };

  pickBuy();
  void speak(de.tradeWelcome);
}
