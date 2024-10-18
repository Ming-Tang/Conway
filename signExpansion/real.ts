import type { Ord } from "../conway";
import type { Real } from "../real";
import { ordinalEnsure as ensure } from "../op/ordinal";
import { isOne, isZero } from "../op/comparison";
import {
	concat,
	cycleArray,
	empty,
	fromArray,
	maybeSimplifyConst,
	type Seq,
} from "../seq";
import {
	Dyadic,
	dyadicAbs,
	dyadicFromNumber,
	dyadicIsSafeNumber,
	dyadicMinus,
	dyadicPlus,
	dyadicSignExpansionFrac,
	dyadicToMixed,
} from "../dyadic";

const cycleArray0 = <T>(xs: T[], mult: Ord) => {
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

export const dyadicOrNumber = (d: Dyadic): Real =>
	dyadicIsSafeNumber(d) ? d.quotient : d.isInteger ? d.bigintQuotient : d;

const plusNumber = (r: number): Real =>
	dyadicOrNumber(dyadicPlus(dyadicFromNumber(r)));

const minusNumber = (r: number): Real =>
	dyadicOrNumber(dyadicMinus(dyadicFromNumber(r)));

export const realPlus = (r: Real): Real => {
	if (r instanceof Dyadic) {
		return dyadicPlus(r);
	}

	if (typeof r === "bigint" && r >= 0n) {
		return r + 1n;
	}
	return plusNumber(Number(r));
};

export const realMinus = (r: Real): Real => {
	if (r instanceof Dyadic) {
		return dyadicMinus(r);
	}
	if (typeof r === "bigint" && r <= 0n) {
		return r - 1n;
	}
	return minusNumber(Number(r));
};

const signExpansionNumber = (r: number, omitInitial = false): Seq<Sign> => {
	if (r === 0) {
		return empty as Seq<Sign>;
	}

	if (!Number.isFinite(r)) {
		throw new RangeError(`Not a finite number: ${r}`);
	}

	return signExpansionDyadic(dyadicFromNumber(r), omitInitial);
};

export const signExpansionDyadic = (
	d: Dyadic,
	omitInitial = false,
): Seq<Sign> => {
	if (d.isZero) {
		return empty as Seq<Sign>;
	}

	const isPositive = d.isPositive;
	const abs = dyadicAbs(d);
	if (abs.isInteger) {
		const ip = abs.bigintQuotient;
		return cycleArray0([isPositive], ensure(omitInitial ? ip - 1n : ip));
	}

	const [integerPart, fracPart] = dyadicToMixed(abs);
	const fracSigns: Sign[] = [...dyadicSignExpansionFrac(fracPart)];
	return concat(
		cycleArray0(
			[isPositive],
			ensure(omitInitial ? integerPart : integerPart + 1n),
		),
		fromArray(isPositive ? fracSigns : fracSigns.map((x) => !x)),
	);
};

export const signExpansionBigint = (
	r: bigint,
	omitInitial = false,
): Seq<Sign> => {
	if (r === 0n) {
		return empty as Seq<Sign>;
	}
	if (r > 0) {
		return cycleArray0([true], ensure(omitInitial && r ? r - 1n : r));
	}
	return cycleArray0([false], ensure(omitInitial && r ? -r + 1n : -r));
};

export const signExpansionReal = (r: Real, omitInitial = false): Seq<Sign> =>
	r instanceof Dyadic
		? signExpansionDyadic(r, omitInitial)
		: typeof r === "bigint"
			? signExpansionBigint(r, omitInitial)
			: signExpansionNumber(r, omitInitial);
