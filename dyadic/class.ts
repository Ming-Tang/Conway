import { makeInternable } from "../internable";

// Range of parameters to be interned
const P_RANGE = 128n;
const Q_RANGE = 4n;

/**
 * A rational number with a power of 2 as the denominator.
 * The `numerator` is a `bigint` and the denominator is `1n << power`
 * where `power` is a non-negative `bigint`.
 *
 * ## Equality
 * `dyadicNew(p1, q1)` equals `dyadicNew(p2, q2)`
 * if and only if `p1 << q2 === p2 << q1`
 *
 * Wikipedia: [Dyadic rational](https://en.wikipedia.org/wiki/Dyadic_rational)
 */
export class Dyadic {
	private static INTERN = makeInternable<
		Dyadic,
		[bigint, bigint | undefined],
		bigint
	>({
		shouldIntern: (p, q = 0n) =>
			p <= P_RANGE && p >= -P_RANGE && q <= Q_RANGE && q >= -Q_RANGE,
		eqHash: (d: Dyadic) => {
			// Different from the eqHash for real numbers
			return (d.numerator << Q_RANGE) >> d.power;
		},
		eq: (a: Dyadic, b: Dyadic) => {
			return a === b || (a.numerator === b.numerator && a.power === b.power);
		},
		create: (p, q = 0n) => new Dyadic(p, q),
	});

	public static create = this.INTERN.create;
	public static intern = this.INTERN.intern;

	public static readonly ZERO = Dyadic.intern(0n, 0n);
	public static readonly ONE = Dyadic.intern(1n, 0n);
	public static readonly HALF = Dyadic.intern(1n, 1n);
	public static readonly NEG_ONE = Dyadic.intern(-1n, 0n);

	public readonly numerator: bigint;
	/** The exponent of the denominator. Cannot be negative. */
	public readonly power: bigint = 0n;

	private constructor(p: bigint, q = 0n) {
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

	public get isNegOne() {
		return this.numerator === -1n && this.power === 0n;
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
		// Denominator is too large
		if (this.power >= 512n) {
			return 0;
		}
		return Number(this.numerator) / Number(1n << this.power);
	}

	public toString(radix?: number) {
		return (this.isInteger ? this.bigintQuotient : this.quotient).toString(
			radix,
		);
	}

	public [Symbol.toPrimitive](hint: string) {
		if (hint === "string") {
			return this.toString();
		}
		if (hint === "bigint") {
			return this.bigintQuotient.toString();
		}
		return this.quotient;
	}
}

export const dyadicNew: (p: bigint, q?: bigint) => Dyadic = Dyadic.create;
