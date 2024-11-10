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
