import { one, zero } from ".";
import { Conway, type Conway0, type Ord0 } from "../conway";
import {
	realAbs,
	realCeilingToBigint,
	realFloorToBigint,
	realIsNegative,
	realIsPositive,
	realIsZero,
	realLe,
	realNeg,
	realNegOne,
	realOne,
	realToBigint,
	realZero,
	type Real,
} from "../real";
import { signExpansionFromConway } from "../signExpansion/reader/normalForm";
import { gt, isNegative, isZero } from "./comparison";
import { isOrdinal, ordinalAdd, succ } from "./ordinal";

const roundToOrdReal = (x: Real): Real =>
	realIsNegative(x) ? realZero : realCeilingToBigint(x);

/**
 * Given a surreal number, get the ordinal number equals to its
 * leading prefix of pluses in its sign expansion.
 *
 * If `x` is negative, return zero.
 * If `x` is an ordinal number, return itself.
 * If `signExpansion(x) = +^k & - & ...`, then
 * `roundToOrd(x) = k`
 */
export const roundToOrd = (x: Conway0): Ord0 => {
	if (isNegative(x) || isZero(x)) {
		return zero;
	}

	if (isOrdinal(x)) {
		return x;
	}

	if (!(x instanceof Conway)) {
		return roundToOrdReal(x);
	}

	let sum = 0n as Ord0;
	for (const { sign, length } of signExpansionFromConway(x)) {
		if (!sign) {
			break;
		}
		sum = ordinalAdd(sum, length);
	}
	return sum;
};

export const rightReal = (x: Real): Real => {
	if (realIsZero(x)) {
		return realOne;
	}

	const ip = realFloorToBigint(x);
	return ip + 1n;
};

/**
 * Get the simplest surreal number greater than it.
 */
export const right = (x: Conway0): Ord0 => {
	if (isZero(x)) {
		return one;
	}
	if (isNegative(x)) {
		return zero;
	}

	const x1 = roundToOrd(x);
	return gt(x1, x) ? x1 : succ(x1);
};

// TODO rename
export const lcaReal = (a: Real, b: Real) => {
	if (realLe(b, a)) {
		throw new RangeError(`Cannot find { ${a} | ${b} }`);
	}

	// a < 0 and b > 0
	if (realIsNegative(a) && realIsPositive(b)) {
		return realZero;
	}

	// a < 0 and b = 0
	if (realIsNegative(a) && realIsZero(b)) {
		return realNegOne;
	}

	// a = 0 and b > 0
	if (realIsZero(a) && realIsPositive(b)) {
		return realOne;
	}

	if (!(realIsPositive(a) && realIsPositive(b))) {
		throw new Error("not possible");
	}

	const sgn = realIsNegative(a);
	const aa = realAbs(a);
	const ab = realAbs(b);

	let value = a;
	if (realToBigint(aa) !== realToBigint(ab)) {
		value = aa;
	} else {
		throw new Error("Not implemented");
	}

	return sgn ? realNeg(value) : value;
};

// TODO rename
// TODO <a | b> when a < b
export const lca = (a: Conway0, b: Conway0): Conway0 => {
	throw new Error("Not implemented");
};
