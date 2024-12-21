import { Conway, type Conway0, type Ord0 } from "./conway";
import { unit } from "./op";
import { eq, isOne, isZero } from "./op/comparison";
import { canon, isLimit, pred } from "./op/ordinal";
import { type Real, realToBigint, realZero } from "./real";

/**
 * Evaluates the Wainer hierarchy function.
 * @param ord The ordinal number alpha
 * @param n The natural number in `bigint`
 * @returns The result in `bigint`
 */
export const wainer = (ord: Ord0, n: bigint): bigint => {
	if (isZero(ord)) {
		return n + 1n;
	}
	if (isLimit(ord)) {
		return wainer(canon(ord, n), n);
	}

	let iter = 0n;
	const o1 = pred(ord);
	for (let i = 0n; i < n; i += 1n) {
		iter = wainer(o1, n);
	}
	return iter;
};

/**
 * Evaluates the Hardy hierarchy function.
 * @param ord The ordinal number alpha
 * @param n The natural number in `bigint`
 * @returns The result in `bigint`
 */
export const hardy = (ord: Ord0, n: bigint): bigint => {
	// console.log('hardy', ord, n);
	if (isZero(ord)) {
		return n;
	}
	// Closed form solutions
	if (ord instanceof Conway) {
		if (eq(ord, unit)) {
			return 2n * n;
		}
		if (ord.length === 1) {
			if (isOne(ord.leadingPower ?? 0)) {
				const a = realToBigint(ord.leadingCoeff);
				return n * (1n << a);
			}
		}
	}
	if (isLimit(ord)) {
		return hardy(canon(ord, n), n);
	}
	return hardy(pred(ord), n + 1n);
};

/**
 * Evaluates the slow-growing hierarchy function.
 * @param ord The ordinal number alpha
 * @param n The natural number in `bigint`
 * @returns The result in `bigint`
 */
export const slow = (ord: Ord0, n: bigint): bigint => {
	// See https://en.wikipedia.org/wiki/Slow-growing_hierarchy
	if (isZero(ord)) {
		return 0n;
	}
	if (isOne(ord)) {
		return 1n;
	}
	const r = ord instanceof Conway ? ord.realValue : ord;
	if (typeof r === "number" || typeof r === "bigint") {
		return BigInt(r);
	}
	if (eq(ord, unit)) {
		return n;
	}
	if (ord instanceof Conway) {
		if (eq(ord, unit)) {
			return n;
		}
		if (ord.length === 1) {
			if (isOne(ord.leadingPower ?? realZero)) {
				const a = realToBigint(ord.leadingCoeff);
				return n + a;
			}
			if (isOne(ord.leadingCoeff) && !(ord.leadingPower instanceof Conway)) {
				return n ** realToBigint(ord.leadingPower || 0n);
			}
			if (isOne(ord.leadingCoeff) && eq(ord.leadingPower ?? 0, unit)) {
				return n ** n;
			}
		}
	}

	if (isLimit(ord)) {
		return slow(canon(ord, n), n);
	}
	return slow(pred(ord), n) + 1n;
};
