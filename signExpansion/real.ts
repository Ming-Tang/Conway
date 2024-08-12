import type { Conway, Real } from "../conway";
import { ensure } from "../op";
import { isOne, isZero } from "../op/comparison";
import {
	concat,
	cycleArray,
	empty,
	fromArray,
	maybeSimplifyConst,
	type Seq,
} from "../seq";

const cycleArray0 = <T>(xs: T[], mult: Conway) => {
	if (isZero(mult) || xs.length === 0) {
		return empty as Seq<T>;
	}
	if (isOne(mult)) {
		return maybeSimplifyConst(fromArray(xs));
	}
	return maybeSimplifyConst(cycleArray(xs, mult));
};

export type Sign = boolean;

export const fracSignExpansion = (
	fracPart: number,
	push?: (sign: boolean) => void,
): [number, number] => {
	let mid = 1;
	let half = 0.5;
	while (half) {
		if (fracPart === mid) {
			break;
		}

		if (fracPart > mid) {
			push?.(true);
			mid += half;
		} else {
			push?.(false);
			mid -= half;
		}
		half /= 2;
	}
	return [mid, half];
};

export const plusNumber = (r: number): number => {
	if (r >= 0 && Number.isInteger(r)) {
		return r + 1;
	}

	const isPositive = r > 0;
	const pos = isPositive ? r : -r;
	const half =
		Number.isInteger(r) && r < 0
			? 0.5
			: fracSignExpansion(pos - Math.floor(pos))[1];
	// console.log({ r, init: pos - Math.floor(pos), pos, half });
	return r + half;
};

export const minusNumber = (r: number): number => -plusNumber(-r);

export const plus = (r: Real): Real => {
	if (typeof r === "bigint" && r >= 0n) {
		return r + 1n;
	}
	return plusNumber(Number(r));
};

export const minus = (r: Real): Real => {
	if (typeof r === "bigint" && r <= 0n) {
		return r - 1n;
	}
	return minusNumber(Number(r));
};

export const signExpansionNumber = (r: number): Seq<Sign> => {
	if (r === 0) {
		return empty as Seq<Sign>;
	}

	if (!Number.isFinite(r)) {
		throw new RangeError(`Not a finite number: ${r}`);
	}

	const isPositive = r > 0;
	const integerPart = r < 0 ? Math.floor(-r) : Math.floor(r);
	const fracPart = r < 0 ? -r - integerPart : r - integerPart;
	const integerSigns = cycleArray0([isPositive], ensure(integerPart));
	if (fracPart === 0) {
		return integerSigns;
	}

	const fracSigns: Sign[] = [];
	fracSignExpansion(fracPart, (s) => fracSigns.push(s === isPositive));
	return concat(
		cycleArray0([isPositive], ensure(integerPart + 1)),
		fromArray(fracSigns),
	);
};

export const signExpansionBigint = (r: bigint): Seq<Sign> => {
	if (r === 0n) {
		return empty as Seq<Sign>;
	}
	if (r > 0) {
		return cycleArray0([true], ensure(r));
	}
	return cycleArray0([false], ensure(-r));
};

export const signExpansionReal = (r: Real): Seq<Sign> =>
	typeof r === "bigint" ? signExpansionBigint(r) : signExpansionNumber(r);
