import { ensure, mono, one, zero } from ".";
import { Conway, type Conway0, type Ord0 } from "../conway";
import {
	realAbs,
	realFloorToBigint,
	realIsNegative,
	realIsPositive,
	realIsZero,
	realLe,
	realMult,
	realNeg,
	realNegOne,
	realOne,
	realToBigint,
	realZero,
	type Real,
} from "../real";
import { neg } from "./arith";
import {
	eq,
	ge,
	isAboveReals,
	isNegative,
	isPositive,
	isZero,
} from "./comparison";
import { isOrdinal, succ } from "./ordinal";

/**
 * Given a surreal number, get the ordinal number equals to its
 * leading prefix of pluses in its sign expansion.
 */
export const roundToOrd = (x: Conway0): Ord0 => {
	if (!isPositive(x)) {
		return zero;
	}

	if (isOrdinal(x)) {
		return x;
	}

	if (!(x instanceof Conway)) {
		return realFloorToBigint(x);
	}

	let sum: Conway = zero;
	for (const [p, c] of x) {
		if (isNegative(c)) {
			break;
		}

		if (isNegative(p)) {
			sum = sum.add(one);
			break;
		}

		if (isOrdinal(p)) {
			if (isOrdinal(c)) {
				sum = sum.add(mono(c, p));
				continue;
			}

			sum = sum.add(mono(realFloorToBigint(c), p));
			break;
		}

		sum = sum.add(mono(realFloorToBigint(c), roundToOrd(p)));
	}
	return sum as Ord0;
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

	return succ(roundToOrd(x));
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
