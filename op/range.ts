import { birthday, ensure, mono, mono1, one, termAt, zero } from ".";
import { Conway, type Conway0, type Ord0 } from "../conway";
import {
	Dyadic,
	dyadicFromBigint,
	dyadicFromNumber,
	dyadicLca,
} from "../dyadic";
import {
	realAbs,
	realCeilingToBigint,
	realEq,
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
import { signExpansion } from "../signExpansion/gonshor";
import { realMinus, realPlus } from "../signExpansion/real";
import { add, neg, sub } from "./arith";
import {
	eq,
	gt,
	isNegative,
	isPositive,
	isZero,
	le,
	lt,
	ne,
	sign,
} from "./comparison";
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
	for (const { sign, length } of signExpansion(x)) {
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

/**
 * "Least common ancestor".
 * Given two surreal numbers `a` and `b`, get the surreal
 * number `a < x < b` with its birthday minimized.
 * Throws `RangeError` if `b >= a`.
 * @returns `{ a | b }`
 */
export const lca = (a: Conway0, b: Conway0): Conway0 => {
	// In Conway normal form:
	// { a + b | a + c } = a + { b | c }
	// { a w^p | b w^p } = { a | b } x^p
	// { w^p | w^q } = w^{ p | q }
	// if p
	// { a w^p + ... | b w^q + ... } =
	//   0                       if { a | b } = 0
	//   -{ -a w^p | -b w^q }    if a < 0 && b < 0
	//   { a w^p | }             if { p | q } = { p | }

	if (!(a instanceof Conway) && !(b instanceof Conway)) {
		return lcaReal(a, b);
	}

	const va = ensure(a);
	const vb = ensure(b);
	if (isNegative(va) && isPositive(vb)) {
		return zero;
	}

	if (isNegative(va) && isNegative(vb)) {
		return neg(lca(neg(va), neg(vb)));
	}

	// Both are zero or positive
	if (va.isZero) {
		if (isZero(va.infinitePart) && isZero(va.realPart)) {
			// { 0 | infinitesimal } = even smaller infinitesimal
			return va.infinitesimalPart;
		}
		return one;
	}

	throw new Error("Not implemented");
};
