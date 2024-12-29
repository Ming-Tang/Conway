import type { Dyadic } from "./class";

const BASE = 7;
const PRIME = 59;
export const MASK = (1 << 31) - 1;
export const MASK0 = (1n << 31n) - 1n;

export const EQ_HASH_ZERO = BASE;

export const eqHashBigint = (value: bigint): number =>
	(BASE + Number(value & MASK0)) & MASK;

export const eqHashInteger = (value: number): number =>
	(BASE + (value & MASK)) & MASK;

export const dyadicEqHash = (d: Dyadic): number => {
	let h = BASE;
	h = (h + Number(d.numerator & MASK0)) & MASK;
	if (d.power !== 0n) {
		h = (((h * PRIME) & MASK) + Number(d.power & MASK0)) & MASK;
	}
	return h;
};
