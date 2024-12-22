import {
	abs,
	add,
	fromBigint,
	half,
	neg,
	negOne,
	one,
	sub,
	zero,
} from "./arith";
import { type Dyadic, dyadicNew } from "./class";
import { eq, ge, gt, lt, ne } from "./comp";

export const toMixed = (p: Dyadic): [bigint, Dyadic] => {
	if (p.isInteger) {
		return [p.numerator, zero];
	}

	if (p.isNegative) {
		const [q, f] = toMixed(neg(p));
		return [-q, neg(f)];
	}

	const q = p.bigintQuotient;
	return [q, sub(p, fromBigint(q))];
};

export const birthday = (p: Dyadic): bigint => {
	if (p.isNegative) {
		return p.isInteger ? -p.numerator : birthday(neg(p));
	}

	if (p.isInteger) {
		return p.numerator;
	}

	const [n, q] = toMixed(abs(p));
	return n + 1n + q.power;
};

/**
 * Given a dyadic, returns a new dyadic with plus appended to its sign expansion.
 */
export const plus = (p: Dyadic): Dyadic => {
	if (p.isZero) {
		return one;
	}

	if (p.isNegative || !p.isInteger) {
		return dyadicNew((p.numerator << 1n) + 1n, p.power + 1n);
	}

	return dyadicNew(p.numerator + (1n << p.power), p.power);
};

/**
 * Given a dyadic, returns a new dyadic with minus appended to its sign expansion.
 */
export const minus = (p: Dyadic): Dyadic => {
	if (p.isZero) {
		return negOne;
	}

	if (p.isPositive || !p.isInteger) {
		return dyadicNew((p.numerator << 1n) - 1n, p.power + 1n);
	}

	return dyadicNew(p.numerator - (1n << p.power), p.power);
};

export const withSign = (p: Dyadic, sign: boolean) =>
	sign ? plus(p) : minus(p);

/**
 * Given a Dyadic within `(0, 1]`,
 * return the sign expansion as a `Generator` of booleans without
 * the initial plus. `true` for plus and `false` for minus.
 * @throws RangeError if the dyadic is outside of the interval `(0, 1]`
 */
export const signExpansionFrac = function* (f: Dyadic) {
	if (f.isOne) {
		return;
	}

	if (!f.isPositive || ge(f, one)) {
		throw new RangeError("signExpansionFrac: must be between 0 and 1");
	}

	yield false;

	let mid = half;
	while (ne(mid, f)) {
		if (lt(mid, f)) {
			yield true;
			// plus
			mid = plus(mid);
		} else if (lt(f, mid)) {
			yield false;
			// minus
			mid = minus(mid);
		} else {
			break;
		}
	}
};

const commonAncestorFrac = (af: Dyadic, bf: Dyadic): Dyadic => {
	let mid = half;
	while (true) {
		if (lt(mid, af) && lt(mid, bf)) {
			// plus
			mid = plus(mid);
		} else if (lt(af, mid) && lt(bf, mid)) {
			// minus
			mid = minus(mid);
		} else {
			break;
		}
	}
	return mid;
};

/**
 * Given two `Dyadic`s, return the simplest `Dyadic` between [a, b] inclusive.
 */
export const commonAncestor = (a: Dyadic, b: Dyadic): Dyadic => {
	if (eq(a, b)) {
		return a;
	}

	if (gt(a, b)) {
		return commonAncestor(b, a);
	}

	// a <= 0 && b >= 0
	if (!a.isPositive && !b.isNegative) {
		return zero;
	}

	// a < 0 && b < 0
	if (a.isNegative && b.isNegative) {
		return neg(commonAncestor(neg(b), neg(a)));
	}

	// a > 0 && b > 0

	// a = [+^a], b = [+^(a+1) - ...]
	if (a.isInteger) {
		return a;
	}

	const [aq, af] = toMixed(a);
	const [bq, bf] = toMixed(b);
	if (aq === bq) {
		// a = aq + af, b = aq + bf
		return add(fromBigint(aq), commonAncestorFrac(af, bf));
	}
	// a = aq + af, b = aq + 1 + ...
	return fromBigint(aq + 1n);
};

export const simplestBetween = (a: Dyadic, b: Dyadic): Dyadic => {
	if (!lt(a, b)) {
		throw new RangeError("dyadicSimplestBetween: (a < b) must be true");
	}
	const c = commonAncestor(a, b);
	if (lt(a, c) && lt(c, b)) {
		return c;
	}

	if (eq(c, a)) {
		// c = a < b
		let pc = plus(c);
		if (lt(pc, b)) {
			return pc;
		}
		while (!lt(pc, b)) {
			pc = minus(pc);
		}
		return pc;
	}

	// a < b = b
	let pc = minus(c);
	if (lt(a, pc)) {
		return pc;
	}
	while (!lt(a, pc)) {
		pc = plus(pc);
	}
	return pc;
};
