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
	public static readonly HALF = new Dyadic(1n, 1n);
	public static readonly NEG_ONE = new Dyadic(-1n, 0n);

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

	public toString(radix?: number) {
		return this.quotient.toString(radix);
	}

	public [Symbol.toPrimitive](hint: string) {
		if (hint === "string") {
			return this.toString();
		}
		return this.quotient;
	}
}
