import {
	realAdd,
	realBirthday,
	realCompare,
	realIsNegative,
	realIsOne,
	realIsPositive,
	realIsZero,
	realMult,
	realNeg,
	realOne,
	realSign,
	realSub,
	realToBigint,
	realZero,
	type Real,
} from "./real";

const customInspectSymbol = Symbol.for("nodejs.util.inspect.custom");

const freeze = <T>(v: T) => Object.freeze(v);

export type BothIsOrd<A, B> = [A, B] extends [true, true] ? true : boolean;

export type Ord = Conway<true>;

export type Ord0 = Real | Ord;

export type Conway0<IsOrd extends boolean = boolean> = Real | Conway<IsOrd>;

export type InferIsOrdNumber<T extends number | bigint> = T extends
	| 0n
	| 0
	| 1n
	| 1
	| 2n
	| 2
	| 3n
	| 3
	| 4n
	| 4
	? true
	: `${T}` extends `-${string}` | `${string}.${string}`
		? boolean
		: number extends T
			? boolean
			: bigint extends T
				? boolean
				: true;

export type InferIsOrd<T extends Conway0> = Ord0 extends T
	? true
	: T extends number | bigint
		? InferIsOrdNumber<T>
		: T extends { isOrdinal: true }
			? true
			: boolean;

const notImplemented = () => {
	throw new Error("Not implemented. Need to import the correct module.");
};

// For splitting up this Conway class into different modules
export const INSTANCE_IMPLS = {
	ordinalAdd: (a: Ord, b: Ord0): Ord => notImplemented(),
	ordinalMult: (a: Ord, b: Ord0): Ord => notImplemented(),
	ordinalRightSub: (a: Ord, b: Ord0): Ord => notImplemented(),
	ordinalDivRem: (a: Ord, b: Ord0): [Ord, Ord] => notImplemented(),
	ordinalPow: (a: Ord, b: Ord0): Ord => notImplemented(),
};

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
export class Conway<IsOrd extends boolean = boolean> {
	#eqHash: number | null = null;
	#ordHash: bigint | null = null;

	readonly #isOrdinal: boolean;

	readonly #terms: Readonly<[Conway0<IsOrd>, Real][]>;

	/** 0 */
	public static readonly zero: Ord = new Conway();
	/** 1 */
	public static readonly one: Ord = new Conway([[0n, 1n]]);
	/** omega */
	public static readonly unit: Ord = new Conway([[1n, 1n]]);
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
		iter?: [Conway0<IsOrd>, Real][] | Iterable<[Conway0<IsOrd>, Real]> | null,
		_unchecked = false,
	) {
		let terms = Array.isArray(iter) ? [...iter] : iter ? [...iter] : [];
		if (_unchecked) {
			this.#terms = freeze(
				terms.map((x) => freeze<[Conway0<IsOrd>, Real]>(x)),
			) as Readonly<[Conway0<IsOrd>, Real][]>;
			this.#isOrdinal = this.#terms.every(
				([p, c]) => Conway.isOrdinal(p) && Conway.isOrdinal(c),
			);
			return;
		}
		Conway.sortTermsDescending(terms);

		const newTerms = [] as typeof terms;
		terms = terms.map(([p, c]) => [Conway.maybeDowngrade(p), c]);
		for (const [p, c] of terms) {
			if (Conway.isZero(c)) {
				continue;
			}
			const found = newTerms.find(([p1]) => Conway.eq(p1, p));
			if (!found) {
				newTerms.push([p, c]);
				continue;
			}
			found[1] = realAdd(c, found[1]);
		}

		this.#terms = freeze(
			newTerms
				.filter(([_, c]) => !Conway.isZero(c))
				.map((x) => freeze<[Conway0<IsOrd>, Real]>(x)),
		) as Readonly<[Conway0<IsOrd>, Real][]>;
		this.#isOrdinal = this.#terms.every(
			([p, c]) => Conway.isOrdinal(p) && Conway.isOrdinal(c),
		);
	}

	private static sortTermsDescending(terms: [Conway0, Real][]) {
		terms.sort(([e1, c1], [e2, c2]): number => {
			const compExp = Conway.compare(e1, e2);
			return compExp === 0 ? realCompare(c1, c2) : compExp;
		});
	}

	/**
	 * Creates a new surreal number based on a real number (no infinite parts).
	 * @param value The real number value in number or bigint.
	 * @returns A surreal number that constructs this real number.
	 */
	public static real(value: Real): Conway {
		return new Conway(realIsZero(value) ? [] : [[realZero, value]], true);
	}

	/**
	 * Creates a new monomial surreal number given coefficient and exponent.
	 * @param value The coefficient in number or bigint.
	 * @param power The exponent, which is a number, bigint or `Conway`.
	 */
	public static mono<R extends Real, P extends Conway0>(
		value: R,
		power: P,
	): Conway<BothIsOrd<InferIsOrd<R>, InferIsOrd<P>>> {
		if (realIsZero(value)) {
			return Conway.zero;
		}
		return new Conway([[Conway.maybeDowngrade(power), value]], true) as never;
	}

	public static mono1<P extends Conway0>(power: P): Conway<InferIsOrd<P>> {
		return new Conway([[Conway.maybeDowngrade(power), realOne]], true) as never;
	}

	public static ensure<V extends Conway0>(value: V): V & Conway<boolean> {
		return value instanceof Conway ? value : (Conway.real(value) as never);
	}

	/**
	 * If this surreal number represents a pure real number, return the real number,
	 * otherwise return the surreal itself.
	 */
	public static maybeDowngrade<IsOrd extends boolean = boolean>(
		value: Conway0<IsOrd>,
	): Conway0<IsOrd> {
		if (!(value instanceof Conway)) {
			return value;
		}

		if (value.isZero) {
			return 0n;
		}
		if (value.isOne) {
			return 1n;
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
		return realIsPositive(c);
	}

	public get isNegative(): boolean {
		if (this.#terms.length === 0) {
			return false;
		}

		const [_, c] = this.#terms[0];
		return realIsNegative(c);
	}

	/**
	 * Returns true if and only if this number is a monomial (1 term in Conway normal form).
	 */
	public get isMonomial(): boolean {
		return this.length <= 1;
	}

	// Number line
	// isBelowNegativeReals | realValue < 0 | isNegativeInfinitesimal | isZero | isPositiveInfinitesimal | realValue > 0 | isAboveReals

	/**
	 * Returns true if and only if this number is positive and infinite.
	 */
	public get isAboveReals(): boolean {
		if (this.#terms.length === 0) {
			return false;
		}
		const [p, c] = this.#terms[0];
		return Conway.isPositive(p) && realIsPositive(c);
	}

	/**
	 * Returns true if and only if this number is positive and is negative infinite.
	 */
	public get isBelowNegativeReals(): boolean {
		if (this.#terms.length === 0) {
			return false;
		}
		const [p, c] = this.#terms[0];
		return Conway.isPositive(p) && realIsNegative(c);
	}

	public get isPositiveInfinitesimal(): boolean {
		if (this.#terms.length === 0) {
			return false;
		}
		const [p, c] = this.#terms[0];
		return Conway.isNegative(p) && realIsPositive(c);
	}

	public get isNegativeInfinitesimal(): boolean {
		if (this.#terms.length === 0) {
			return false;
		}
		const [p, c] = this.#terms[0];
		return Conway.isNegative(p) && realIsNegative(c);
	}

	/**
	 * Returns true if and only if this number represents an ordinal number (natural number coefficients and exponents are ordinal).
	 */
	public get isOrdinal(): IsOrd {
		return this.#isOrdinal as IsOrd;
	}

	/**
	 * Returns true if and only if all coefficients are positive.
	 */
	public get isPositiveDefinite() {
		return this.#terms.every(([_, c]) => !realIsNegative(c));
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

	public get infinitePart(): Conway<IsOrd> {
		return this.filterTerms((p) => Conway.isPositive(p)) as Conway<IsOrd>;
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
	public get leadingPower(): Conway0<IsOrd> | null {
		if (this.#terms.length === 0) {
			return null;
		}

		return this.#terms[0][0] as Conway<IsOrd>;
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

	/**
	 * Get the size of the power tower of omega this number is greater than.
	 * Let `T(0) = 1, T(n) = w^T(n-1)`.
	 * For all `x`, `x < T(x.order + 1)`
	 */
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

	/**
	 * Get the `order` of the negation of this value.
	 */
	public get negativeOrder(): number {
		if (this.#terms.length === 0) {
			return 0;
		}

		if (!this.isBelowNegativeReals) {
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
		const sign = realToBigint(realSign(c0));
		let powHash = 0n;

		if (e0 instanceof Conway && e0.order > 1) {
			powHash = 64n * BigInt(e0.order);
		} else if (e0 instanceof Conway && e0.isAboveReals) {
			const [p0] = e0.#terms[0];
			powHash = Conway.isAboveReals(p0)
				? 21n + (p0 instanceof Conway ? realToBigint(p0.order) : 0n)
				: Conway.isPositive(p0)
					? 21n
					: 20n;
		} else if (e0 instanceof Conway && e0.isBelowNegativeReals) {
			powHash = 1n;
		} else {
			for (const [threshold, shift] of Conway.#POW_THRESHOLDS) {
				if (Conway.compare(e0, threshold, true) < 0) {
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

	// TODO also ensures is ordinal
	public static isZero(value: Conway0): boolean {
		return (
			value === 0 || value === 0n || (value instanceof Conway && value.isZero)
		);
	}

	// TODO also ensures is ordinal
	public static isOne(value: Conway0): boolean {
		return (
			value === 1 || value === 1n || (value instanceof Conway && value.isOne)
		);
	}

	public static isPositive(value: Conway0): boolean {
		if (value instanceof Conway) {
			return value.isPositive;
		}
		return realIsPositive(value);
	}

	public static isNegative(value: Conway0): boolean {
		if (value instanceof Conway) {
			return value.isNegative;
		}
		return realIsNegative(value);
	}

	public static isAboveReals(value: Conway0): boolean {
		if (value instanceof Conway) {
			return value.isAboveReals;
		}
		return false;
	}

	public static isBelowNegativeReals(value: Conway0): boolean {
		if (value instanceof Conway) {
			return value.isBelowNegativeReals;
		}
		return false;
	}

	public static isOrdinal(value: Conway0): value is Ord0 {
		return (
			(typeof value === "bigint" && value >= 0n) ||
			(typeof value === "number" && value >= 0 && Number.isInteger(value)) ||
			(value instanceof Conway && value.isOrdinal)
		);
	}

	public static realValue(value: Conway0): null | Real {
		return value instanceof Conway ? value.realValue : value;
	}

	static #EQ_HASH_CACHE = new Map<Real, number>([]);

	private static realEqHash(value: Real): number {
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
		} else if (
			typeof value === "number" &&
			Number.isInteger(value) &&
			value > -256 &&
			value < 256
		) {
			Conway.#EQ_HASH_CACHE.set(value, h);
		}
		return h;
	}

	public static eqHash(value: Conway0): number {
		if (value instanceof Conway) {
			return value.eqHash;
		}
		return Conway.realEqHash(value);
	}

	// #endregion
	// #region Arithmetic

	public neg(): Conway {
		return new Conway(
			this.#terms.map(([e, c]) => [e, realNeg(c)]),
			true,
		);
	}

	public add<B extends Conway0 = Conway0>(
		other: B,
	): Conway<BothIsOrd<IsOrd, InferIsOrd<B>>> {
		if (Conway.isZero(other)) {
			return this as never;
		}

		if (!(other instanceof Conway)) {
			const newTerms: [Conway0<never>, Real][] = [];
			let added = false;
			for (const [e1, c1] of this) {
				if (!added && Conway.isZero(e1)) {
					newTerms.push([e1 as Conway0<never>, realAdd(c1, other)]);
					added = true;
				} else {
					newTerms.push([
						e1 as Conway0<never>,
						Conway.isZero(e1) ? realAdd(c1, other) : c1,
					]);
				}
			}
			if (!added) {
				newTerms.push([realZero, other]);
			}
			return new Conway<never>(newTerms);
		}

		const terms: [Conway0<never>, Real][] = [];
		for (const [e1, c1] of Conway.ensure(other)) {
			terms.push([e1 as Conway0<never>, c1]);
		}

		for (const [e1, c1] of this) {
			const found = terms.find(([e]) => Conway.eq(e, e1));
			if (!found) {
				terms.push([e1 as Conway0<never>, c1]);
			} else {
				found[1] = realAdd(found[1], c1);
			}
		}
		return new Conway<never>(terms);
	}

	public sub(other: Conway0): Conway {
		return this.add(other instanceof Conway ? other.neg() : realNeg(other));
	}

	public mult<A extends Conway0>(
		other: A,
	): Conway<BothIsOrd<IsOrd, InferIsOrd<A>>> {
		if (Conway.isZero(other)) {
			return Conway.zero as Conway<never>;
		}

		if (Conway.isOne(other)) {
			return this as never;
		}

		if (!(other instanceof Conway)) {
			const newTerms: [Conway0<never>, Real][] = [];
			for (const [e1, c1] of this) {
				newTerms.push([e1 as Conway0<never>, realMult(c1, other)]);
			}
			return new Conway<never>(newTerms);
		}

		const terms: [Conway0<never>, Real][] = [];

		for (const [e1, c1] of this) {
			for (const [e2, c2] of other) {
				const e3 = Conway.add(e1, e2);
				const found = terms.find(([e]) => Conway.eq(e, e3));
				const prod = realMult(c1, c2);
				if (!found) {
					terms.push([e3 as Conway0<never>, prod]);
				} else {
					found[1] = realAdd(found[1], prod);
				}
			}
		}
		return new Conway<never>(terms);
	}

	public ordinalAdd(this: Ord, other: Ord0): Ord {
		return INSTANCE_IMPLS.ordinalAdd(this, other);
	}

	public ordinalMult(this: Ord, other: Ord0): Ord {
		return INSTANCE_IMPLS.ordinalMult(this, other);
	}

	public ordinalRightSub(this: Ord, right: Ord0): Ord {
		return INSTANCE_IMPLS.ordinalRightSub(this, right);
	}

	public ordinalDivRem(this: Ord, right: Ord0): [Ord, Ord] {
		return INSTANCE_IMPLS.ordinalDivRem(this, right);
	}

	public ordinalPow(this: Ord, other: Ord0): Ord0 {
		return INSTANCE_IMPLS.ordinalPow(this, other);
	}

	/**
	 * Performs an iteration of long division that allows the leading term of this
	 * number to be eliminated.
	 * @param value The divisor
	 * @returns The quotient and remainder as a tuple
	 */
	public divRem(value: Conway0): [Conway, Conway] {
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
	public divRemIters(value: Conway0, iters: number): [Conway0, Conway] {
		let q: Conway0 = Conway.zero;
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

	// #endregion
	// #region Arithmetic (static)

	public static neg(value: Conway0): Conway0 {
		return value instanceof Conway ? value.neg() : realNeg(value);
	}

	public static add<A extends Conway0 = Conway0, B extends Conway0 = Conway0>(
		left: A,
		right: B,
	): Conway0<BothIsOrd<InferIsOrd<A>, InferIsOrd<B>>> {
		if (!(left instanceof Conway) && !(right instanceof Conway)) {
			return realAdd(left, right);
		}
		const l1 = Conway.ensure(left);
		const r1 = Conway.ensure(right);
		return l1.add(r1) as Conway<never>;
	}

	public static sub(left: Conway0, right: Conway0): Conway0 {
		if (!(left instanceof Conway) && !(right instanceof Conway)) {
			return realSub(left, right);
		}
		const l1 = Conway.ensure(left);
		const r1 = Conway.ensure(right);
		return l1.sub(r1);
	}

	public static mult<A extends Conway0 = Conway0, B extends Conway0 = Conway0>(
		left: A,
		right: B,
	): Conway0<BothIsOrd<InferIsOrd<A>, InferIsOrd<B>>> {
		if (typeof left === "bigint" && typeof right === "bigint") {
			return left * right;
		}
		if (typeof left === "number" && typeof right === "number") {
			return left * right;
		}
		const l1 = Conway.ensure(left);
		const r1 = Conway.ensure(right);
		return l1.mult(r1) as Conway<never>;
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

		let sum: Conway = Conway.zero;
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
	public birthday(realBirthday = Conway.realBirthday): Ord0 {
		let lastP: Conway0 = Conway.zero;
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
				return Conway.unit
					.ordinalMult(len)
					.ordinalAdd(Conway.sub(bc, 1n) as Ord);
			}

			// Infinite part
			const bp = Conway.ensure(p).birthday(realBirthday);
			return Conway.mono1(bp).ordinalMult(bc);
		}) as Ord0;
	}

	public static birthday(
		value: Conway0,
		realBirthday = Conway.realBirthday,
	): Ord0 {
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
		return realBirthday(real);
	}

	// #endregion Birthday
	// #region Collection

	/**
	 * Get a frozen view of the terms, which is an array of `[power, coeff]` tuples.
	 */
	public getTerms() {
		return this.#terms;
	}

	public get length(): number {
		return this.#terms.length;
	}

	public getByIndex(index: number): Readonly<[Conway0, Real]> {
		if (index < 0 || index > this.#terms.length) {
			throw new RangeError("getByIndex: out of bounds");
		}
		return this.#terms[index];
	}

	public has(exp: Conway0): boolean {
		return !!this.#terms.find(([e1]) => Conway.compare(exp, e1) === 0);
	}

	public get(exp: Conway0): Real {
		const found = this.#terms.find(([e1]) => Conway.compare(exp, e1) === 0);
		return found ? found[1] : 0;
	}

	public [Symbol.iterator](): IterableIterator<
		Readonly<[Conway0<IsOrd>, Real]>
	> {
		return this.#terms[Symbol.iterator]();
	}

	public filterTerms(f: (pow: Conway0, coeff: Real) => boolean): Conway {
		return new Conway(this.#terms.filter(([p, c]) => f(p, c)));
	}

	public ordSumTerms(f: (pow: Conway0<IsOrd>, coeff: Real) => Ord0): Ord0 {
		return this.#terms
			.map(([p, c]) => f(p, c))
			.reduce(
				(a, b) => (Conway.ensure(a) as Ord).ordinalAdd(b as Ord),
				Conway.zero as Ord,
			);
	}

	public sumTerms(
		f: (pow: Conway0<IsOrd>, coeff: Real, index: number) => Conway0,
	): Conway0 {
		return this.#terms
			.map(([p, c], i) => f(p, c, i))
			.reduce(Conway.add, Conway.zero);
	}

	public multTerms(f: (pow: Conway0<IsOrd>, coeff: Real) => Conway0): Conway0 {
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
				m = `${variable}^[${e}]`;
			}

			if (realIsNegative(c)) {
				parts.push(
					`-${first ? "" : " "}${realIsOne(realNeg(c)) && m ? "" : realNeg(c)}${m}`,
				);
			} else {
				parts.push(`${first ? "" : "+ "}${realIsOne(c) && m ? "" : c}${m}`);
			}
			first = false;
		}

		return parts.length === 0 ? "0" : parts.join(" ");
	}

	public toLaTeX(): string {
		return this.toString()
			.replace(/\^(-?[0-9]+(?:\.[0-9]*)?)/g, "^{$1}")
			.replace(/w\b/g, "\\omega")
			.replace(/[\[\]]/g, (x) => (x === "[" ? "{" : "}"));
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
		left: Conway0,
		right: Conway0,
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

	public static eq(left: Conway0, right: Conway0) {
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
	// #endregion
}
