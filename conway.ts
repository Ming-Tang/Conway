import {
	realAdd,
	realIntegerDiv,
	realIntegerPow,
	realMult,
	realNeg,
	realOne,
	realSub,
	type Real,
} from "./real";

const customInspectSymbol = Symbol.for("nodejs.util.inspect.custom");

const freeze = <T>(v: T) => Object.freeze(v);

/**
 * Represents the Conway normal form of a surreal number.
 *
 * Any surreal number with the following can be represented by this type.
 * - coefficients of `number` or `bigint`,
 * - is a finite sum of terms
 * - having birthday below epsilon numbers (epsilon_0)
 *
 * The Conway normal form is represented as a list of
 * [power, coefficient] tuples.
 * The `length, has, get, [@@Iterable]` methods behave like a map
 * from exponent to value.
 *
 * Ordinal numbers can be represented by this type as well.
 * The `isOrdinal` property determines if any value is an ordinal number
 * and there are ordinal arithmetic operations.
 *
 * Invariants of the power/coefficient array representation:
 * - The terms are sorted from largest to smallest by exponent.
 * - If the exponent is a real number, then it is not wrapped in `Conway`.
 * - Each coefficient is non-zero.
 */
export class Conway {
	#eqHash: number | null = null;
	#ordHash: bigint | null = null;

	readonly #terms: Readonly<[Real | Conway, Real][]>;

	/** 0 */
	public static readonly zero: Conway = new Conway();
	/** 1 */
	public static readonly one: Conway = new Conway([[0n, 1n]]);
	/** omega */
	public static readonly unit: Conway = new Conway([[1n, 1n]]);
	/** omega^-1 */
	public static readonly inverseUnit: Conway = new Conway([[-1n, 1n]]);
	/** log(omega) = omega^(1/omega) */
	public static readonly logUnit: Conway = new Conway([
		[Conway.inverseUnit, 1n],
	]);
	/** exp(omega) = omega^omega */
	public static readonly expUnit: Conway = new Conway([[Conway.unit, 1n]]);

	// #region Creation

	/**
	 * Creates a new surreal number in Conway normal form given an array or iterable
	 * of tuple [exponent of omega, coefficient] for each element.
	 *
	 * Zero coefficients will be filtered out.
	 * @param iter The array or iterable of [exponent, coefficient] pairs.
	 */
	public constructor(
		iter?: [Real | Conway, Real][] | Iterable<[Real | Conway, Real]> | null,
		_unchecked = false,
	) {
		let terms = Array.isArray(iter) ? [...iter] : iter ? [...iter] : [];
		if (_unchecked) {
			this.#terms = freeze(
				terms.map((x) => freeze<[Real | Conway, Real]>(x)),
			) as Readonly<[Real | Conway, Real][]>;
			return;
		}
		Conway.sortTermsDescending(terms);

		const newTerms = [] as typeof terms;
		terms = terms.map(([e, c]) => [Conway.maybeDowngrade(e), c]);
		for (const [e, c] of terms) {
			if (Conway.isZero(c)) {
				continue;
			}
			const found = newTerms.find(([e1]) => Conway.eq(e1, e));
			if (!found) {
				newTerms.push([e, c]);
				continue;
			}
			found[1] = realAdd(c, found[1]);
		}

		this.#terms = freeze(
			newTerms
				.filter(([_, c]) => !Conway.isZero(c))
				.map((x) => freeze<[Real | Conway, Real]>(x)),
		) as Readonly<[Real | Conway, Real][]>;
	}

	private static sortTermsDescending(terms: [Real | Conway, Real][]) {
		terms.sort(([e1, c1], [e2, c2]): number => {
			const compExp = Conway.compare(e1, e2);
			return compExp === 0 ? (c2 > c1 ? 1 : c2 === c1 ? 0 : -1) : compExp;
		});
	}

	/**
	 * Creates a new surreal number based on a real number (no infinite parts).
	 * @param value The real number value in number or bigint.
	 * @returns A surreal number that constructs this real number.
	 */
	public static real(value: Real): Conway {
		return new Conway([[0, value]]);
	}

	/**
	 * Creates a new monomial surreal number given coefficient and exponent.
	 * @param value The coefficient in number or bigint.
	 * @param power The exponent, which is a number, bigint or `Conway`.
	 */
	public static mono(value: Real, power: Real | Conway): Conway {
		return new Conway([[power, value]]);
	}

	public static mono1(power: Real | Conway): Conway {
		return new Conway([[power, 1n]]);
	}

	public static ensure(value: Real | Conway) {
		return value instanceof Conway ? value : Conway.real(value);
	}

	/**
	 * If this surreal number represents a pure real number, return the real number,
	 * otherwise return the surreal itself.
	 */
	public static maybeDowngrade(value: Real | Conway): Real | Conway {
		if (!(value instanceof Conway)) {
			return value;
		}

		if (value.isZero) {
			return 0;
		}
		if (value.isOne) {
			return 1;
		}

		const rv = value.realValue;
		if (rv !== null) {
			return rv;
		}

		return value;
	}

	// #endregion
	// #region Properties

	public get isZero(): boolean {
		if (this.#terms.length === 0) {
			return true;
		}

		return this.#terms.every(([_, c]) => Conway.isZero(c));
	}

	public get isOne(): boolean {
		return (
			this.#terms.length === 1 &&
			Conway.isZero(this.#terms[0][0]) &&
			Conway.isOne(this.#terms[0][1])
		);
	}

	/**
	 * Returns true if and only if this number equals to omega (monomial with coefficient 1 and power 1).
	 */
	public get isUnit(): boolean {
		return (
			this.#terms.length === 1 &&
			Conway.isOne(this.#terms[0][0]) &&
			Conway.isOne(this.#terms[0][1])
		);
	}

	public get isPositive(): boolean {
		if (this.#terms.length === 0) {
			return false;
		}

		const [_, c] = this.#terms[0];
		return c > 0;
	}

	public get isNegative(): boolean {
		if (this.#terms.length === 0) {
			return false;
		}

		const [_, c] = this.#terms[0];
		return c < 0;
	}

	/**
	 * Returns true if and only if this number is a monomial (1 term in Conway normal form).
	 */
	public get isMonomial(): boolean {
		return this.length <= 1;
	}

	/**
	 * Returns true if and only if this number is positive and infinite.
	 */
	public get isAboveReals(): boolean {
		if (this.#terms.length === 0) {
			return false;
		}
		const [p, c] = this.#terms[0];
		return (p instanceof Conway ? p.isPositive : p > 0) && c > 0;
	}

	/**
	 * Returns true if and only if this number is positive and is negative infinite.
	 */
	public get isBelowNegativeReals(): boolean {
		if (this.#terms.length === 0) {
			return false;
		}
		const [p, c] = this.#terms[0];
		return (p instanceof Conway ? p.isPositive : p > 0) && c < 0;
	}

	/**
	 * Returns true if and only if this number represents an ordinal number (natural number coefficients and exponents are ordinal).
	 */
	public get isOrdinal(): boolean {
		return this.#terms.every(
			([p, c]) => Conway.isOrdinal(p) && Conway.isOrdinal(c),
		);
	}

	/**
	 * Returns true if and only if all coefficients are positive.
	 */
	public get isPositiveDefinite() {
		return this.#terms.every(([_, c]) => c >= 0);
	}

	/**
	 * If this surreal number represetns a pure real number, return its real number value in number or bigint.
	 * Otherwise, return null.
	 */
	public get realValue(): null | Real {
		if (this.#terms.length === 0) {
			return 0n;
		}
		if (this.#terms.length > 1 || !Conway.isZero(this.#terms[0][0])) {
			return null;
		}
		return this.#terms[0][1];
	}

	public get infinitePart(): Conway {
		return this.filterTerms((p) => Conway.isPositive(p));
	}

	public get realPart(): Real {
		return this.#terms.length === 0 ? 0 : this.get(0);
	}

	public get infinitesimalPart(): Conway {
		return this.filterTerms((p) => Conway.isNegative(p));
	}

	/**
	 * Get the exponent of the leading term (or null if this surreal number is zero.)
	 */
	public get leadingPower(): Conway | Real | null {
		if (this.#terms.length === 0) {
			return null;
		}

		return this.#terms[0][0];
	}

	/**
	 * Get the coefficient of the leading term (or null if this surreal number is zero.)
	 */
	public get leadingCoeff(): Real {
		if (this.#terms.length === 0) {
			return 0;
		}

		return this.#terms[0][1];
	}

	public get order(): number {
		if (this.#terms.length === 0) {
			return 0;
		}

		if (!this.isAboveReals) {
			return 0;
		}

		const [p, _] = this.#terms[0];
		return 1 + (p instanceof Conway ? p.order : 0);
	}

	// @ts-expect-error freeze
	static #POW_THRESHOLDS: Readonly<[Conway, bigint][]> = freeze(
		[
			[Conway.real(6), 17n],
			[Conway.real(5), 16n],
			[Conway.real(4), 15n],
			[Conway.real(3), 14n],
			[Conway.real(2), 13n],
			[Conway.real(1), 12n],
			[Conway.real(0), 11n],
			[Conway.real(-1), 10n],
			[Conway.real(-2), 9n],
			[Conway.real(-3), 8n],
			[Conway.real(-4), 7n],
			[Conway.real(-5), 6n],
			[Conway.real(-6), 5n],
		].map(freeze),
	);

	/**
	 * Get the ordering hash code, which is a number.
	 */
	public get ordHash(): bigint {
		if (typeof this.#ordHash === "bigint") {
			return this.#ordHash;
		}

		if (this.isZero) {
			this.#ordHash = 0n;
			return 0n;
		}

		let h = 0n;
		const [e0, c0] = this.#terms[0];
		const sign = c0 === 0n || c0 === 0n ? 0n : c0 > 0n ? 1n : -1n;
		let powHash = 0n;

		if (e0 instanceof Conway && e0.isAboveReals) {
			const [p0] = e0.#terms[0];
			powHash = Conway.isAboveReals(p0)
				? 21n + (p0 instanceof Conway ? BigInt(p0.order) : 0n)
				: Conway.isPositive(p0)
					? 21n
					: 20n;
		} else if (e0 instanceof Conway && e0.isBelowNegativeReals) {
			powHash = 1n;
		} else {
			for (const [threshold, shift] of Conway.#POW_THRESHOLDS) {
				if (Conway.gt(e0, threshold, true)) {
					powHash = shift;
					break;
				}
			}
		}

		h = sign * ((1n << powHash) * 2n);
		this.#ordHash = h;
		return h;
	}

	/**
	 * Get the hash code of this surreal number for the purpose of equality.
	 */
	public get eqHash(): number {
		if (typeof this.#eqHash === "number") {
			return this.#eqHash;
		}

		const MASK = 0xffff_ffff;
		const MULT = 31;
		let h = 0;
		for (const [e, c] of this.#terms) {
			if (Conway.isZero(c)) {
				continue;
			}

			h = MULT * h + Conway.eqHash(e);
			h = h & MASK;
			h = MULT * h + Conway.eqHash(c);
			h = h & MASK;
		}
		this.#eqHash = h;
		return h;
	}

	// #endregion
	// #region Properties (static)

	public static isZero(value: Real | Conway): boolean {
		return (
			value === 0 || value === 0n || (value instanceof Conway && value.isZero)
		);
	}

	public static isOne(value: Real | Conway): boolean {
		return (
			value === 1 || value === 1n || (value instanceof Conway && value.isOne)
		);
	}

	public static isPositive(value: Real | Conway): boolean {
		if (value instanceof Conway) {
			return value.isPositive;
		}
		return value > 0;
	}

	public static isNegative(value: Real | Conway): boolean {
		if (value instanceof Conway) {
			return value.isNegative;
		}
		return value < 0;
	}

	public static isAboveReals(value: Real | Conway): boolean {
		if (value instanceof Conway) {
			return value.isAboveReals;
		}
		return false;
	}

	public static isBelowNegativeReals(value: Real | Conway): boolean {
		if (value instanceof Conway) {
			return value.isBelowNegativeReals;
		}
		return false;
	}

	public static isOrdinal(value: Real | Conway): boolean {
		return (
			(typeof value === "bigint" && value >= 0n) ||
			(typeof value === "number" && value >= 0 && Number.isInteger(value)) ||
			(value instanceof Conway && value.isOrdinal)
		);
	}

	public static realValue(value: Real | Conway): null | Real {
		return value instanceof Conway ? value.realValue : value;
	}

	static #EQ_HASH_CACHE = new Map<Real, number>([]);

	public static eqHash(value: Real | Conway): number {
		if (value instanceof Conway) {
			return value.eqHash;
		}

		if (value === 0 || value === 0n) {
			return 0;
		}

		const found = Conway.#EQ_HASH_CACHE.get(value);
		if (typeof found === "number") {
			return found;
		}

		const s = value.toString();
		const MASK = 0xffff_ffff;
		const MULT = 31;
		let h = 0;
		for (let i = 0; i < s.length; i++) {
			h = MULT * h + s.charCodeAt(i);
			h = h & MASK;
		}

		if (typeof value === "bigint" && value > -256n && value < 256n) {
			Conway.#EQ_HASH_CACHE.set(value, h);
		} else if (typeof value === "number" && value > -256 && value < 256) {
			Conway.#EQ_HASH_CACHE.set(value, h);
		}
		return h;
	}

	// #endregion
	// #region Arithmetic

	public neg(): Conway {
		return new Conway(this.#terms.map(([e, c]) => [e, -c]));
	}

	public add(other: Real | Conway): Conway {
		if (Conway.isZero(other)) {
			return this;
		}

		if (!(other instanceof Conway)) {
			const newTerms: [Real | Conway, Real][] = [];
			let added = false;
			for (const [e1, c1] of this) {
				if (!added && Conway.isZero(e1)) {
					newTerms.push([e1, realAdd(c1, other)]);
					added = true;
				} else {
					newTerms.push([e1, Conway.isZero(e1) ? realAdd(c1, other) : c1]);
				}
			}
			if (!added) {
				newTerms.push([0, other]);
			}
			return new Conway(newTerms);
		}

		const terms: [Real | Conway, Real][] = [];
		for (const [e1, c1] of Conway.ensure(other)) {
			terms.push([e1, c1]);
		}

		for (const [e1, c1] of this) {
			const found = terms.find(([e]) => Conway.eq(e, e1));
			if (!found) {
				terms.push([e1, c1]);
			} else {
				found[1] = realAdd(found[1], c1);
			}
		}
		return new Conway(terms);
	}

	public sub(other: Real | Conway): Conway {
		return this.add(other instanceof Conway ? other.neg() : -other);
	}

	/**
	 * Performs ordinal number addition.
	 * Does not check if `this` and `other` are both ordinals.
	 */
	public ordinalAdd(other: Real | Conway): Conway {
		if (!(other instanceof Conway)) {
			return this.add(other);
		}

		const cutoff = other.leadingPower;
		if (cutoff === null) {
			return this.add(other);
		}

		return this.filterTerms((p1) => Conway.ge(p1, cutoff)).add(other);
	}

	private static ordinalMultInfiniteFinite(inf: Conway, i: Real): Conway {
		if (Conway.isZero(i)) {
			return Conway.zero;
		}
		if (Conway.isOne(i)) {
			return inf;
		}
		if (i < 0) {
			throw new Error("Multiplier cannot be negative");
		}

		if (typeof i === "bigint") {
			if (i === 2n) {
				return inf.ordinalAdd(inf);
			}
			const pred = i - 1n;
			const { leadingPower: p0, leadingCoeff: c0 } = inf;
			return Conway.mono(realMult(c0, pred), p0 ?? Conway.zero).ordinalAdd(inf);
		}
		return Conway.ordinalMultInfiniteFinite(inf, BigInt(i));
	}

	/**
	 * Performs ordinal number multiplication.
	 * Does not check if `this` and `other` are both ordinals.
	 */
	public ordinalMult(other: Real | Conway): Conway {
		if (!(other instanceof Conway)) {
			return this.mult(other);
		}

		if (this.isZero || other.isZero) {
			return Conway.zero;
		}
		if (this.isOne) {
			return other;
		}
		if (other.isOne) {
			return this;
		}

		const { realPart: i1 } = this;
		const { realPart: i2 } = other;
		// i1 * i2 = i1 * i2
		if (!this.isAboveReals && !other.isAboveReals) {
			return Conway.ensure(realMult(i1, i2));
		}
		// (...) * i2
		if (!other.isAboveReals) {
			return Conway.ordinalMultInfiniteFinite(this, i2);
		}
		if (!this.isAboveReals) {
			const { infinitePart: inf2 } = other;
			// i1 nonzero: i1 * (inf2 + i2) = inf2 + i1 * i2
			return Conway.isZero(i1) ? Conway.zero : inf2.add(realMult(i1, i2));
		}
		const p0 = this.leadingPower ?? Conway.zero;
		let tot = Conway.zero;
		for (const [p, c] of other) {
			if (Conway.isZero(p)) {
				tot = tot.ordinalAdd(Conway.ordinalMultInfiniteFinite(this, c));
				continue;
			}
			tot = tot.ordinalAdd(Conway.mono(c, Conway.ordinalAdd(p0, p)));
		}
		return tot;
	}

	/**
	 * Performs ordinal number exponentiation. `0^0 = 1` instead of throwing an error.
	 * Does not check if `this` and `other` are both ordinals.
	 */
	public ordinalPow(other: Real | Conway): Conway {
		if (!(other instanceof Conway)) {
			return this.ordinalPowFinite(BigInt(other));
		}

		if (other.isZero) {
			return Conway.one;
		}

		if (this.isZero) {
			return Conway.zero;
		}

		if (this.isOne) {
			return Conway.one;
		}

		if (other.isOne) {
			return this;
		}

		const otherFinite = other.realValue;
		if (otherFinite !== null) {
			return this.ordinalPowFinite(BigInt(otherFinite));
		}

		const thisFinite = this.realValue;
		let prod = Conway.one;
		if (thisFinite !== null) {
			for (const [p, c] of other) {
				if (Conway.isZero(p)) {
					// finite^finite
					const coeff1 =
						typeof thisFinite === "bigint" && typeof c === "bigint"
							? thisFinite ** c
							: Number(thisFinite) ** Number(c);
					prod = prod.ordinalMult(coeff1);
					continue;
				}

				if (Conway.isOne(p)) {
					// finite^(w.c) = (finite^w)^c = w^c
					prod = prod.ordinalMult(Conway.mono1(c));
					continue;
				}

				// finite^(w^p . c)

				// p is finite:
				// finite^(w^0) = finite
				// finite^(w^(n+1))
				// = finite^(w . w^n) = (finite^w)^(w^n)
				// = w^(w^n)
				// finite^(w^(n+1).c)
				// = w^(w^n.c)

				// p is infinite:
				// = finite^(w^p . c)
				// = w^(w^p . c)
				const prv = Conway.ensure(p).realValue;
				if (prv !== null) {
					const exponent = Conway.ordinalMult(
						Conway.mono1(realSub(prv, realOne)),
						c,
					);
					prod = prod.ordinalMult(Conway.mono1(exponent));
				} else {
					prod = prod.ordinalMult(
						Conway.mono1(Conway.ordinalMult(Conway.mono1(p), c)),
					);
				}
			}

			return prod;
		}

		const leadPow = Conway.ensure(this.leadingPower ?? Conway.zero);
		for (const [p, c] of other) {
			if (Conway.isZero(p)) {
				// x^finite
				prod = prod.ordinalMult(this.ordinalPowFinite(BigInt(c)));
				continue;
			}
			// x^(w^p . c)
			// = (w^leadPow)^(w^p . c)
			// = w^(leadPow . (w^p . c))
			const prodPow = Conway.mono(
				1n,
				Conway.ordinalMult(leadPow, Conway.mono(c, p)),
			);
			prod = prod.ordinalMult(prodPow);
		}

		return prod;
	}

	public ordinalPowFinite(other: bigint): Conway {
		if (other === 0n) {
			return Conway.one;
		}
		if (other === 1n) {
			return this;
		}
		const rv = this.realValue;
		if (rv !== null) {
			// finite^finite
			return Conway.ensure(
				typeof rv === "bigint" ? rv ** other : Number(rv) ** Number(other),
			);
		}

		// infinite^finite
		if (other === 2n) {
			return this.ordinalMult(this);
		}

		if (other === 3n) {
			return this.ordinalMult(this).ordinalMult(this);
		}

		const m = this.ordinalPowFinite(other >> 2n);
		const m2 = m.ordinalMult(m);
		const m4 = m2.ordinalMult(m2);
		let prod = m4;
		const mod = other % 4n;
		for (let i = 0n; i < mod; i += 1n) {
			prod = prod.ordinalMult(this);
		}
		return prod;
	}

	/**
	 * Find the solution `x` such that `this.ordinalAdd(x).eq(other)`.
	 */
	public ordinalRightSub(other: Real | Conway): Conway {
		const c = Conway.compare(this, other);
		if (c < 0) {
			throw new RangeError(`No solution: ${this} > ${other}`);
		}
		if (c === 0) {
			return Conway.zero;
		}

		const other1 = Conway.ensure(other);
		if (this.isZero) {
			return other1;
		}

		let left: Conway = this;
		let right = other1;
		while (left.length > 0 && right.length > 0) {
			const [p2, c2] = right.#terms[0];
			const [p1, c1] = left.#terms[0];
			if (Conway.ne(p1, p2)) {
				break;
			}

			const diffCoeff = realAdd(c2, -c1);
			if (Conway.isZero(diffCoeff)) {
				left = new Conway(left.#terms.slice(1));
				right = new Conway(right.#terms.slice(1));
				continue;
			}

			return new Conway([[p1, realAdd(c2, -c1)], ...right.#terms.slice(1)]);
		}
		return right;
	}

	public mult(other: Real | Conway): Conway {
		if (Conway.isZero(other)) {
			return Conway.zero;
		}

		if (Conway.isOne(other)) {
			return this;
		}

		if (!(other instanceof Conway)) {
			const newTerms: [Real | Conway, Real][] = [];
			for (const [e1, c1] of this) {
				newTerms.push([e1, realMult(c1, other)]);
			}
			return new Conway(newTerms);
		}

		const terms: [Real | Conway, Real][] = [];

		for (const [e1, c1] of this) {
			for (const [e2, c2] of other) {
				const e3 = Conway.add(e1, e2);
				const found = terms.find(([e]) => Conway.eq(e, e3));
				const prod = realMult(c1, c2);
				if (!found) {
					terms.push([e3, prod]);
				} else {
					found[1] = realAdd(found[1], prod);
				}
			}
		}
		return new Conway(terms);
	}

	/**
	 * Performs an iteration of long division that allows the leading term of this
	 * number to be eliminated.
	 * @param value The divisor
	 * @returns The quotient and remainder as a tuple
	 */
	public divRem(value: Conway | Real): [Conway, Conway] {
		if (Conway.isZero(value)) {
			throw new RangeError("division by zero");
		}

		if (this.isZero) {
			return [Conway.zero, Conway.zero];
		}

		if (!(value instanceof Conway)) {
			return [
				/* value === 1 || value === 1n ? this : */ this.mult(
					1.0 / Number(value),
				),
				Conway.zero,
			];
		}

		// (c0 w^e0 + ...) / (c1 w^e1 + ...)
		// = (c0/c1) w^(e0-e1) + ...
		const [e0, c0] = this.#terms[0];
		const [e1, c1] = value.#terms[0];
		const de = Conway.sub(e0, e1);
		const cr =
			/*typeof c0 === "bigint" && typeof c1 === "bigint" && (c1 === 1n || c1 === -1n || c0 % c1 === 0n)
			? c0 / c1
			:*/ Number(c0) / Number(c1);
		const q = Conway.mono(cr, de);
		const qv = value.mult(q);
		return [q, this.sub(qv)];
	}

	/**
	 * Performs an a fixed number of iterations of long division.
	 * @param value The divisor
	 * @param iters The number of iterations
	 * @returns The quotient and remainder as a tuple
	 */
	public divRemIters(
		value: Conway | Real,
		iters: number,
	): [Conway | Real, Conway] {
		let q: Conway | Real = Conway.zero;
		let r: Conway = this;
		for (let i = 0; i < iters; i++) {
			if (r.isZero) {
				break;
			}
			const [q1, r1] = r.divRem(value);
			q = Conway.add(q, q1);
			r = r1;
		}
		return [q, r];
	}

	private static finiteOrdinalDiv(value: Real, other: Real) {
		return realIntegerDiv(value, other);
	}

	/**
	 * Given this number (must be ordinal) `N` and another ordinal number `D`,
	 * find `q, r` such that `r < d` and `D * q + r = N`.
	 * @param value The divisor
	 * @returns The quotient and remainder as a tuple
	 */
	public ordinalDivRem(div: Conway | Real): [Conway | Real, Conway | Real] {
		if (Conway.isZero(div)) {
			throw new RangeError("division by zero");
		}

		if (this.isZero) {
			return [this, Conway.zero];
		}

		if (Conway.isOne(div)) {
			return [this, Conway.zero];
		}

		if (Conway.eq(this, div)) {
			return [Conway.one, Conway.zero];
		}

		const rv = div instanceof Conway ? div.realValue : div;
		if (rv !== null) {
			const q = Conway.finiteOrdinalDiv(this.leadingCoeff, rv);
			const r = Conway.ordinalRightSub(Conway.ordinalMult(div, q), this);
			return [q, r];
		}

		// div is infinite below

		const v = Conway.ensure(div);
		let quotient: Conway | Real = Conway.zero;
		let remainder: Conway | Real = this;
		// D * ((w^p0).q0 + qRest) + r = (w^P0).C0 + N_Rest
		// ((w^dp0) D0 + ...) * ((w^p0).q0 + ...) + r = (w^P0) C0 + ...
		//  --> (w^dp0 D0) * (w^p0 q0) = (w^P0 C0)
		//      Case 1 (dp0 = P0): w^P0 (D0 q0) = w^P0 C0 --> use division
		//      Case 2           : w^P0 w^p0 q0 = w^P0 C0 --> q0 = c0, p0 = subtraction
		// (p0, q0) = divMono(dp0, D0, p0, q0)
		// D * qRest + (r + ...) = N_Rest

		for (const [pUpper, cUpper] of this) {
			const [pd0, cd0] = v.#terms[0];
			if (Conway.lt(pUpper, pd0)) {
				break;
			}

			const de = Conway.ordinalRightSub(pd0, pUpper);
			const cr = Conway.isZero(de)
				? Conway.finiteOrdinalDiv(cUpper, cd0)
				: cUpper;
			if (!cr) {
				continue;
			}

			let dq = Conway.mono(cr, de);
			let toSub = Conway.ordinalMult(div, dq);
			if (Conway.lt(remainder, toSub)) {
				if (cr > 1) {
					const cr1 = realSub(cr, realOne);
					const dq1 = Conway.mono(cr1, de);
					const toSub1 = Conway.ordinalMult(div, dq1);
					if (Conway.lt(remainder, toSub1)) {
						break;
					}
					dq = dq1;
					toSub = toSub1;
				} else {
					break;
				}
			}
			quotient = Conway.ordinalAdd(quotient, dq);
			remainder = Conway.ordinalRightSub(toSub, remainder);
		}

		return [quotient, remainder];
	}

	// #endregion
	// #region Arithmetic (static)

	public static neg(value: Real | Conway): Real | Conway {
		return value instanceof Conway ? value.neg() : realNeg(value);
	}

	public static add(left: Real | Conway, right: Real | Conway): Real | Conway {
		if (!(left instanceof Conway) && !(right instanceof Conway)) {
			return realAdd(left, right);
		}
		const l1 = Conway.ensure(left);
		const r1 = Conway.ensure(right);
		return l1.add(r1);
	}

	public static sub(left: Real | Conway, right: Real | Conway): Real | Conway {
		if (!(left instanceof Conway) && !(right instanceof Conway)) {
			return realSub(left, right);
		}
		const l1 = Conway.ensure(left);
		const r1 = Conway.ensure(right);
		return l1.sub(r1);
	}

	public static ordinalAdd(
		left: Real | Conway,
		right: Real | Conway,
	): Real | Conway {
		if (!(left instanceof Conway) && !(right instanceof Conway)) {
			return realAdd(left, right);
		}
		const l1 = Conway.ensure(left);
		const r1 = Conway.ensure(right);
		return l1.ordinalAdd(r1);
	}

	public static ordinalMult(
		left: Real | Conway,
		right: Real | Conway,
	): Real | Conway {
		if (!(left instanceof Conway) && !(right instanceof Conway)) {
			return realMult(left, right);
		}
		const l1 = Conway.ensure(left);
		const r1 = Conway.ensure(right);
		return l1.ordinalMult(r1);
	}

	public static ordinalPow(left: Real | Conway, right: Real | Conway) {
		if (!(left instanceof Conway) && !(right instanceof Conway)) {
			return realIntegerPow(left, right);
		}
		const l1 = Conway.ensure(left);
		const r1 = Conway.ensure(right);
		return l1.ordinalPow(r1);
	}

	public static ordinalRightSub(
		left: Real | Conway,
		right: Real | Conway,
	): Real | Conway {
		if (!(left instanceof Conway) && !(right instanceof Conway)) {
			if (right < left) {
				throw new RangeError(`No solution: ${left} + ? = ${right}`);
			}
			if (typeof left === "bigint" && typeof right === "bigint") {
				return right - left;
			}
			return Number(right) - Number(left);
		}

		const l1 = Conway.ensure(left);
		return l1.ordinalRightSub(right);
	}

	public static ordinalDivRem(
		left: Real | Conway,
		right: Real | Conway,
	): [Real | Conway, Real | Conway] {
		if (!(left instanceof Conway) && !(right instanceof Conway)) {
			const n = BigInt(left);
			const d = BigInt(right);
			const q = n / d;
			const r = n - q * d;
			return [q, r];
		}

		return Conway.ensure(left).ordinalDivRem(right);
	}

	public static mult(left: Real | Conway, right: Real | Conway): Real | Conway {
		if (typeof left === "bigint" && typeof right === "bigint") {
			return left * right;
		}
		if (typeof left === "number" && typeof right === "number") {
			return left * right;
		}
		const l1 = Conway.ensure(left);
		const r1 = Conway.ensure(right);
		return l1.mult(r1);
	}

	// #endregion
	// #region Exponential Field

	public derivative(): Conway {
		// TODO incomplete
		if (this.realValue !== null) {
			return Conway.zero;
		}

		if (this.isUnit) {
			return Conway.one;
		}

		let sum = Conway.zero;
		for (const [e, c] of this.#terms) {
			if (Conway.isZero(e)) {
				continue;
			}

			if (!(e instanceof Conway)) {
				sum = sum.add(Conway.mono(realMult(e, c), realSub(e, realOne)));
				continue;
			}

			const de = e.derivative();
			if (de.isZero) {
				sum = sum.add(Conway.mono(c, Conway.sub(e, 1n)).mult(e));
				continue;
			}

			sum = sum.add(
				Conway.mono(c, Conway.sub(e, 1n)).mult(
					e.add(Conway.unit.mult(de).mult(Conway.logUnit)),
				),
			);
		}
		return sum;
	}

	// #endregion
	// #region Birthday

	/**
	 * Determines the birthday of this surreal number.
	 */
	public birthday(realBirthday = Conway.realBirthday): Real | Conway {
		let lastP: Real | Conway = Conway.zero;
		return this.ordSumTerms((p, c) => {
			const bc = realBirthday(c);
			if (Conway.isZero(p)) {
				// Real part
				return bc;
			}
			if (Conway.isNegative(p)) {
				// Infinitesimal part:
				// birthday(c0 p^-p0 + c1 p^-p1 + c2 p^-p2 + ...)
				// = bLow(c0, p0) + bLow(c1, p1 - p0) + bLow(c2, p2 - p1) + ...
				// bLow(c, p) = w.birthday(p) + (birthday(c) - 1)
				const pPos = Conway.neg(p);
				const dp = Conway.sub(pPos, lastP);
				lastP = pPos;
				const len = Conway.birthday(dp, realBirthday);
				// +-^(birthday(dp)) SE(coeff)
				return Conway.unit.ordinalMult(len).ordinalAdd(Conway.sub(bc, 1n));
			}

			// Infinite part
			const bp = Conway.ensure(p).birthday(realBirthday);
			return Conway.mono1(bp).ordinalMult(bc);
		});
	}

	public static birthday(
		value: Real | Conway,
		realBirthday = Conway.realBirthday,
	): Real | Conway {
		return value instanceof Conway
			? value.birthday(realBirthday)
			: realBirthday(value);
	}

	/**
	 * Determines the birthday of a bigint or number.
	 * Floating point numbers are treated as exact values and since they
	 * are in the form of (integer * 2^exponent), floating point numbers
	 * have a finite birthday.
	 */
	public static realBirthday(real: Real): Real {
		if (real === 0 || real === 0n) {
			return real;
		}

		if (typeof real === "bigint") {
			return real < 0n ? -real : real;
		}

		const x = real < 0 ? -real : real;
		const iPart = Math.floor(x);
		const fracPart = x - iPart;
		if (fracPart === 0) {
			return iPart;
		}

		let i = 1;
		let mid = 1;
		let half = 0.5;
		while (half) {
			if (fracPart === mid) {
				break;
			}

			if (fracPart > mid) {
				mid += half;
			} else {
				mid -= half;
			}
			i += 1;
			half /= 2;
		}

		return iPart + i;
	}

	// #endregion Birthday
	// #region Collection

	public get length(): number {
		return this.#terms.length;
	}

	public getByIndex(index: number): Readonly<[Conway | Real, Real]> {
		if (index < 0 || index > this.#terms.length) {
			throw new RangeError("getByIndex: out of bounds");
		}
		return this.#terms[index];
	}

	public has(exp: Real | Conway): boolean {
		return !!this.#terms.find(([e1]) => Conway.compare(exp, e1) === 0);
	}

	public get(exp: Real | Conway): Real {
		const found = this.#terms.find(([e1]) => Conway.compare(exp, e1) === 0);
		return found ? found[1] : 0;
	}

	// @ts-ignore Readonly
	public [Symbol.iterator](): IterableIterator<
		Readonly<[Conway | Real, Real]>
	> {
		return this.#terms[Symbol.iterator]();
	}

	public filterTerms(f: (pow: Real | Conway, coeff: Real) => boolean): Conway {
		return new Conway(this.#terms.filter(([p, c]) => f(p, c)));
	}

	public ordSumTerms(
		f: (pow: Real | Conway, coeff: Real) => Real | Conway,
	): Real | Conway {
		return this.#terms
			.map(([p, c]) => f(p, c))
			.reduce(Conway.ordinalAdd, Conway.zero);
	}

	public sumTerms(
		f: (pow: Real | Conway, coeff: Real) => Real | Conway,
	): Real | Conway {
		return this.#terms.map(([p, c]) => f(p, c)).reduce(Conway.add, Conway.zero);
	}

	public multTerms(
		f: (pow: Real | Conway, coeff: Real) => Real | Conway,
	): Real | Conway {
		return this.#terms.map(([p, c]) => f(p, c)).reduce(Conway.mult, Conway.one);
	}

	// #endregion
	// #region Conversion

	// TODO fromRepr/fromJson factory methods

	public toRepr(): [unknown, Real][] {
		return this.#terms.map(([e, c]) => [
			e instanceof Conway ? e.toRepr() : e,
			c,
		]);
	}

	public toJson(preserveBigint = false): {
		t: { e: unknown; c: string | Real }[];
		oh: string;
		eh: number;
	} {
		return {
			oh: `${this.ordHash}`,
			eh: this.eqHash,
			t: this.#terms.map(([e, c]) => ({
				e:
					e instanceof Conway
						? e.toJson(preserveBigint)
						: preserveBigint
							? c
							: typeof e === "bigint"
								? `${e}n`
								: e,
				c: preserveBigint ? c : typeof c === "bigint" ? `${c}n` : c,
			})),
		};
	}

	public toString(): string {
		const variable = "w";
		const parts: string[] = [];
		let first = true;
		let foundZero = false;
		for (const [e, c] of this.#terms) {
			if (Conway.isZero(c)) {
				continue;
			}

			let m = "";
			const r = Conway.realValue(e);
			if (Conway.isZero(e)) {
				m = foundZero ? `_[${e.toString()}]` : "";
				foundZero = true;
			} else if (Conway.isOne(e)) {
				m = `${variable}`;
			} else if (r !== null) {
				m = `${variable}^${r}`;
			} else if (e instanceof Conway && e.isUnit) {
				m = `${variable}^${e.toString()}`;
			} else if (e instanceof Conway) {
				m = `${variable}^[${e.toString()}]`;
			} else {
				m = `${variable}^[${e.toString()}]`;
			}

			if (c < 0) {
				parts.push(
					`-${first ? "" : " "}${Conway.isOne(-c) && m ? "" : -c}${m}`,
				);
			} else {
				parts.push(`${first ? "" : "+ "}${Conway.isOne(c) && m ? "" : c}${m}`);
			}
			first = false;
		}

		return parts.length === 0 ? "0" : parts.join(" ");
	}

	public [customInspectSymbol]() {
		return `Conway(${this.toString()})`;
	}

	public [Symbol.toPrimitive](hint: string) {
		if (hint !== "number") {
			return this.toString();
		}

		const rv = this.realValue;
		if (rv !== null) {
			return Number(rv);
		}

		if (this.isAboveReals) {
			return Number.POSITIVE_INFINITY;
		}
		if (this.isBelowNegativeReals) {
			return Number.NEGATIVE_INFINITY;
		}

		// infinitesimal
		return 0;
	}

	// #endregion
	// #region Ordering and comparison

	public compare(other: Conway, _noHash = false): number {
		if (this === other) {
			return 0;
		}

		if (!_noHash) {
			if (this.ordHash > other.ordHash) {
				return -1;
			}
			if (this.ordHash < other.ordHash) {
				return 1;
			}
		}

		let i = 0;
		let j = 0;
		while (i < this.#terms.length && j < other.#terms.length) {
			const [e1, c1] = this.#terms[i];
			const [e2, c2] = other.#terms[j];
			const ce = Conway.compare(e1, e2);
			if (ce > 0) {
				return Conway.compare(0, c2);
			}
			if (ce < 0) {
				return Conway.compare(c1, 0);
			}

			const cc = Conway.compare(c1, c2);
			if (cc !== 0) {
				return cc;
			}
			i += 1;
			j += 1;
		}

		while (i < this.#terms.length && j >= other.#terms.length) {
			const [, c1] = this.#terms[i];
			const cc = Conway.compare(c1, 0, _noHash);
			if (cc !== 0) {
				return cc;
			}
		}
		while (i >= this.#terms.length && j < other.#terms.length) {
			const [, c2] = other.#terms[j];
			const cc = Conway.compare(0, c2, _noHash);
			if (cc !== 0) {
				return cc;
			}
		}
		return 0;
	}

	public eq(other: Conway): boolean {
		if (this === other) {
			return true;
		}

		if (this.eqHash !== other.eqHash) {
			return false;
		}

		if (this.ordHash !== other.ordHash) {
			return false;
		}

		if (this.isZero && other.isZero) {
			return true;
		}

		if (this.length !== other.length) {
			return false;
		}

		const n = this.length;
		for (let i = 0; i < n; i++) {
			const [e1, c1] = this.#terms[i] ?? [0, 0];
			const [e2, c2] = other.#terms[i] ?? [0, 0];
			if (!Conway.eq(c1, c2)) {
				return false;
			}

			if (!Conway.eq(e1, e2)) {
				return false;
			}
		}
		return true;
	}

	// #endregion
	// #region Ordering and comparison (static)

	// Returns a number with same sign as (right - left)
	public static compare(
		left: Real | Conway,
		right: Real | Conway,
		_noHash = false,
	): number {
		if (left === right) {
			return 0;
		}
		if (typeof left === "bigint" && typeof right === "bigint") {
			const d = right - left;
			return d === 0n ? 0 : d > 0n ? 1 : -1;
		}
		if (
			(typeof left === "number" || typeof left === "bigint") &&
			(typeof right === "number" || typeof right === "bigint")
		) {
			return Number(right) - Number(left);
		}

		const l: Conway = Conway.ensure(left);
		const r: Conway = Conway.ensure(right);
		return l.compare(r, _noHash);
	}

	public static eq(left: Real | Conway, right: Real | Conway) {
		if (left === right) {
			return true;
		}

		if (!(left instanceof Conway) && !(right instanceof Conway)) {
			if (typeof left === "bigint" && typeof right === "bigint") {
				return left === right;
			}
			return Number(left) === Number(right);
		}

		return Conway.ensure(left).eq(Conway.ensure(right));
	}

	public static ne(left: Real | Conway, right: Real | Conway) {
		return !Conway.eq(left, right);
	}

	public static lt(left: Real | Conway, right: Real | Conway) {
		return Conway.compare(left, right) > 0;
	}

	public static gt(left: Real | Conway, right: Real | Conway, _noHash = false) {
		return Conway.compare(left, right, _noHash) < 0;
	}

	public static le(left: Real | Conway, right: Real | Conway) {
		return Conway.compare(left, right) >= 0;
	}

	public static ge(left: Real | Conway, right: Real | Conway) {
		return Conway.compare(left, right) <= 0;
	}
	// #endregion
}
