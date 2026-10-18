import { COINS, coinBreakdown } from '../core/money';
import type { Profile } from '../core/types';

export const GEM = '<span class="gem"></span>';

/** Kleine runde Münzsymbole für eine Liste von Münzen. */
export function coinChips(list: number[]): string {
  return list.map((c) => `<span class="coin small c${c}">${c}</span>`).join('');
}

/** Belohnung als Münzen darstellen. */
export const rewardChips = (amount: number): string => coinChips(coinBreakdown(amount));

/** Alle Münzen im Beutel, gruppiert nach Wert. */
export function walletHtml(p: Pick<Profile, 'coins'>): string {
  return COINS.map((c) => `<span class="wal"><span class="coin small c${c}">${c}</span>×${p.coins[c] ?? 0}</span>`).join('');
}
