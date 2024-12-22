import { dyadicEq, dyadicFromNumber } from ".";
import { Dyadic, dyadicNew } from "./class";

export const zero = Dyadic.ZERO;
export const one = Dyadic.ONE;
export const negOne = Dyadic.NEG_ONE;
export const half = Dyadic.HALF;
export const isZero = (a: Dyadic) => a.isZero;
export const isOne = (a: Dyadic) => a.isOne;
export const isPositive = (a: Dyadic) => a.isPositive;
export const isNegative = (a: Dyadic) => a.isNegative;

export const fromBigint = (a: bigint): Dyadic => dyadicNew(a);

export const fromNumber = (a: number): Dyadic => {
	if (!Number.isFinite(a)) {
		throw new RangeError("not a finite number");
	}

	let value = a;
	let pow = 0n;
	for (let iters = 0n; !Number.isInteger(value) && iters < 1000; iters++) {
		value *= 2;
		pow += 1n;
	}

	return dyadicNew(BigInt(Math.floor(value)), pow);
};

export const sign = (value: Dyadic): -1 | 0 | 1 =>
	value.isZero ? 0 : value.isPositive ? 1 : -1;

export const neg = (a: Dyadic) => dyadicNew(-a.numerator, a.power);

export const abs = (a: Dyadic) => (a.isNegative ? neg(a) : a);

/**
 * Given two `Dyadic`s `p` and `q`, return their sum `p + q`.
 * If the third argument `mult` is provided, return `p + mult * q`
 * instead where `mult` must be a `bigint.
 */
export const add = (p: Dyadic, q: Dyadic, mult = 1n) => {
	if (p.power === 0n && q.power === 0n) {
		return fromBigint(p.numerator + mult * q.numerator);
	}

	const { numerator: a, power: b } = p;
	const { numerator: c, power: d } = q;

	const [min, max] = b < d ? [b, d] : [d, b];
	return dyadicNew((a << (d - min)) + mult * (c << (b - min)), max);
};

/**
 * Dyadic subtraction.
 */
export const sub = (p: Dyadic, q: Dyadic) => add(p, q, -1n);

/**
 * Dyadic multiplication.
 */
export const mult = (p: Dyadic, q: Dyadic) => {
	if (p.power === 0n && q.power === 0n) {
		return fromBigint(p.numerator * q.numerator);
	}
	const { numerator: a, power: b } = p;
	const { numerator: c, power: d } = q;
	return dyadicNew(a * c, b + d);
};

export const dyadicPow2 = Dyadic.pow2;

const EPSILON = fromNumber(Number.EPSILON);

/**
 * Determines if the `Dyadic` can be represented as a
 * JavaScript number without loss of precision.
 */
export const isSafeNumber = (p: Dyadic) => {
	if (p.power >= EPSILON.power) {
		return false;
	}

	if (p.isInteger) {
		const ip = p.bigintQuotient;
		return !(
			ip >= BigInt(Number.MAX_SAFE_INTEGER) ||
			ip <= BigInt(Number.MIN_SAFE_INTEGER)
		);
	}

	return dyadicEq(dyadicFromNumber(p.quotient), p);
};

/**
 * Performs one iteration of dyadic long division, returning
 * quotient and remainder.
 * @returns `[quotient, remainder]`
 */
export const longDivision = (n: Dyadic, d: Dyadic): [Dyadic, Dyadic] => {
	if (d.isZero) {
		throw new RangeError("division by zero");
	}

	if (d.isOne) {
		return [n, zero];
	}

	if (n.isZero) {
		return [zero, zero];
	}

	if (n.isNegative && d.isNegative) {
		const [q, r] = longDivision(neg(n), neg(d));
		return [q, r];
	}

	if (n.isNegative) {
		const [q, r] = longDivision(neg(n), d);
		return [neg(q), neg(r)];
	}

	if (d.isNegative) {
		const [q, r] = longDivision(n, neg(d));
		return [neg(q), neg(r)];
	}

	// both n and d are positive
	let n1 = n.numerator;
	let d1 = d.numerator;
	let pTest = n.power - d.power;
	// eliminate powers of 2 in d1
	while (d1 > 1n && (d1 & 1n) === 0n) {
		d1 >>= 1n;
		pTest++;
	}
	// make sure quotient is non-zero
	while (n1 < d1) {
		n1 <<= 1n;
		pTest++;
	}

	const q = dyadicNew(n1 / d1, pTest);
	return [q, sub(n, mult(d, q))];
};

export const longDivisionIters = (
	n: Dyadic,
	d: Dyadic,
	iters = 1n as number | bigint,
): [Dyadic, Dyadic] => {
	let q = zero;
	let r = n;
	const iters1 = BigInt(iters);
	for (let i = 0n; !r.isZero && i < iters1; i++) {
		const [q1, r1] = longDivision(r, d);
		q = add(q, q1);
		r = r1;
	}
	return [q, r];
};
