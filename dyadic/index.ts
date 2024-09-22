/**
 * A rational number with a power of 2 as the denominator.
 * The `numerator` is a `bigint` and the denominator is `1n << power`
 * where `power` is a non-negative `bigint`.
 *
 * ## Equality
 * `new Dyadic(p1, q1)` equals `new Dyadic(p2, q2)`
 * if and only if `p1 << q2 === p2 << q1`
 *
 * Wikipedia: [Dyadic rational](https://en.wikipedia.org/wiki/Dyadic_rational)
 */
export class Dyadic {
	public static readonly ZERO = new Dyadic(0n, 0n);
	public static readonly ONE = new Dyadic(1n, 0n);

	public readonly numerator: bigint;
	/** The exponent of the denominator. Cannot be negative. */
	public readonly power: bigint = 0n;

	public constructor(p: bigint, q = 0n) {
		if (q < 0n) {
			this.numerator = p << -q;
			this.power = 0n;
			return;
		}
		this.numerator = p;
		this.power = p === 0n ? 0n : q;

		while (
			this.numerator !== 0n &&
			this.power >= 4n &&
			this.numerator % 16n === 0n
		) {
			this.numerator >>= 4n;
			this.power -= 4n;
		}

		while (
			this.numerator !== 0n &&
			this.power > 0n &&
			this.numerator % 2n === 0n
		) {
			this.numerator >>= 1n;
			this.power -= 1n;
		}
	}

	public get isZero() {
		return this.numerator === 0n;
	}

	public get isOne() {
		return this.numerator === 1n && this.power === 0n;
	}

	public get isPositive() {
		return this.numerator > 0n;
	}

	public get isNegative() {
		return this.numerator < 0n;
	}

	public get isInteger() {
		return this.power === 0n;
	}

	public get denominator() {
		return 1n << this.power;
	}

	public get bigintQuotient() {
		return this.numerator >> this.power;
	}

	public get quotient() {
		return Number(this.numerator) / Number(1n << this.power);
	}
}

export const dyadicZero = Dyadic.ZERO;
export const dyadicOne = Dyadic.ONE;
export const dyadicIsZero = (a: Dyadic) => a.isZero;
export const dyadicIsOne = (a: Dyadic) => a.isOne;
export const dyadicIsPositive = (a: Dyadic) => a.isPositive;
export const dyadicIsNegative = (a: Dyadic) => a.isNegative;

const fromBigint = (a: bigint): Dyadic => new Dyadic(a);

const fromNumber = (a: number): Dyadic => {
	if (!Number.isFinite(a)) {
		throw new RangeError("not a finite number");
	}

	let value = a;
	let pow = 0n;
	for (let iters = 0n; !Number.isInteger(value) && iters < 1000; iters++) {
		value *= 2;
		pow += 1n;
	}

	return new Dyadic(BigInt(Math.floor(value)), pow);
};

const sign = (value: Dyadic): -1 | 0 | 1 =>
	value.isZero ? 0 : value.isPositive ? 1 : -1;

const neg = (a: Dyadic) => new Dyadic(-a.numerator, a.power);

const abs = (a: Dyadic) => (a.isNegative ? neg(a) : a);

/**
 * Given two `Dyadic`s `p` and `q`, return their sum `p + q`.
 * If the third argument `mult` is provided, return `p + mult * q`
 * instead where `mult` must be a `bigint.
 */
const add = (p: Dyadic, q: Dyadic, mult = 1n) => {
	if (p.power === 0n && q.power === 0n) {
		return fromBigint(p.numerator + q.numerator);
	}

	const { numerator: a, power: b } = p;
	const { numerator: c, power: d } = q;

	const [min, max] = b < d ? [b, d] : [d, b];
	return new Dyadic((a << (d - min)) + mult * (c << (b - min)), max);
};

const sub = (p: Dyadic, q: Dyadic) => add(p, q, -1n);

const mult = (p: Dyadic, q: Dyadic) => {
	if (p.power === 0n && q.power === 0n) {
		return fromBigint(p.numerator * q.numerator);
	}
	const { numerator: a, power: b } = p;
	const { numerator: c, power: d } = q;
	return new Dyadic(a * c, b + d);
};

const toMixed = (p: Dyadic): [bigint, Dyadic] => {
	if (p.isInteger) {
		return [p.numerator, dyadicZero];
	}

	if (p.isNegative) {
		const [q, f] = toMixed(neg(p));
		return [-q, neg(f)];
	}

	const q = p.bigintQuotient;
	return [q, sub(p, fromBigint(q))];
};

const birthday = (p: Dyadic) => {
	if (p.isNegative) {
		return birthday(neg(p));
	}

	if (p.isInteger) {
		return p.numerator;
	}

	const [n, q] = toMixed(abs(p));
	throw n + q.power;
};

const eq = (a: Dyadic, b: Dyadic) =>
	a.numerator << b.power === b.numerator << a.power;
const ne = (a: Dyadic, b: Dyadic) =>
	a.numerator << b.power !== b.numerator << a.power;
const gt = (a: Dyadic, b: Dyadic) =>
	a.numerator << b.power > b.numerator << a.power;
const ge = (a: Dyadic, b: Dyadic) =>
	a.numerator << b.power >= b.numerator << a.power;
const lt = (a: Dyadic, b: Dyadic) =>
	a.numerator << b.power < b.numerator << a.power;
const le = (a: Dyadic, b: Dyadic) =>
	a.numerator << b.power <= b.numerator << a.power;
const compare = (a: Dyadic, b: Dyadic) => {
	const v = (b.numerator << a.power) - (a.numerator << b.power);
	return v === 0n ? 0 : v > 0n ? 1 : -1;
};

export {
	abs as dyadicAbs,
	fromBigint as dyadicFromBigint,
	fromNumber as dyadicFromNumber,
	sign as dyadicSign,
	neg as dyadicNeg,
	add as dyadicAdd,
	sub as dyadicSub,
	mult as dyadicMult,
	birthday as dyadicBirthday,
	toMixed as dyadicToMixed,
	eq as dyadicEq,
	ne as dyadicNe,
	gt as dyadicGt,
	ge as dyadicGe,
	lt as dyadicLt,
	le as dyadicLe,
	compare as dyadicCompare,
};
