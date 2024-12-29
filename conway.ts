import { Dyadic, dyadicNeg } from "./dyadic";
import { dyadicOrdHash } from "./dyadic/ordHash";
import {
	type Real,
	realAdd,
	realCompare,
	realEq,
	realEqHash,
	realIsNegative,
	realIsOne,
	realIsPositive,
	realIsZero,
	realNeg,
	realOne,
	realToDyadic,
	realZero,
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

export type CreateParams<T extends boolean = boolean> =
	| [Conway0<T>, Real][]
	| null
	| undefined;

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

	// #region Creation

	private constructor(iter?: CreateParams<IsOrd>, _unchecked = false) {
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
		terms = terms.map(([p, c]) => [Conway.maybeUnwrap(p), c]);
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
	 * Creates a new surreal number in Conway normal form given an array or iterable
	 * of tuple [exponent of omega, coefficient] for each element.
	 *
	 * Zero coefficients will be filtered out.
	 * @param iter The array or iterable of [exponent, coefficient] pairs.
	 */
	public static create<T extends boolean>(
		iter?: CreateParams<T>,
		_unchecked = false,
	): Conway<T> {
		if (Conway.zero && (!iter || iter.length === 0)) {
			return Conway.zero as Conway<T>;
		}

		if (!(iter && iter.length === 1)) {
			return new Conway<T>(iter, _unchecked);
		}

		const [p, c] = iter[0];
		if (Conway.isZero(p)) {
			if (Conway.zero && Conway.isZero(c)) {
				return Conway.zero as Conway<T>;
			}
			if (Conway.one && Conway.isOne(c)) {
				return Conway.one as Conway<T>;
			}
			if (Conway.negOne && Conway.isNegOne(c)) {
				return Conway.negOne as Conway<T>;
			}
		} else if (Conway.isOne(p)) {
			if (Conway.unit && Conway.isOne(c)) {
				return Conway.unit as Conway<T>;
			}
		} /* else if (Conway.isNegOne(p)) {
			if (Conway.inverseUnit && Conway.isOne(c)) {
				return Conway.inverseUnit as Conway<T>;
			}
		} */

		return new Conway<T>(iter, _unchecked);
	}

	/** 0 */
	public static readonly zero: Ord = Conway.create<true>();
	/** 1 */
	public static readonly one: Ord = Conway.create<true>([[0n, 1n]]);
	/** -1 */
	public static readonly negOne: Conway = Conway.create([[0n, -1n]]);
	/** w */
	public static readonly unit: Ord = Conway.create<true>([[1n, 1n]]);
	/** w^-1 */
	public static readonly inverseUnit: Conway = Conway.create([[-1n, 1n]]);

	/**
	 * Creates a new surreal number based on a real number (no infinite parts).
	 * @param value The real number value in number or bigint.
	 * @returns A surreal number that constructs this real number.
	 */
	public static real(value: Real): Conway {
		return Conway.create(realIsZero(value) ? [] : [[realZero, value]], true);
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
		return Conway.create([[Conway.maybeUnwrap(power), value]], true) as never;
	}

	public static mono1<P extends Conway0>(power: P): Conway<InferIsOrd<P>> {
		return Conway.create([[Conway.maybeUnwrap(power), realOne]], true) as never;
	}

	public static ensure<V extends Conway0>(value: V): V & Conway<boolean> {
		return value instanceof Conway ? value : (Conway.real(value) as never);
	}

	public mono1(): Conway<IsOrd> {
		return Conway.mono1(this) as Conway<never> as Conway<IsOrd>;
	}

	/**
	 * If this surreal number represents a pure real number, return the real number,
	 * otherwise return the surreal itself.
	 */
	public static maybeUnwrap<IsOrd extends boolean = boolean>(
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

	public get isNegOne(): boolean {
		return (
			this.#terms.length === 1 &&
			Conway.isZero(this.#terms[0][0]) &&
			Conway.isNegOne(this.#terms[0][1])
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

	// Ord hash layout:
	// sign bit + archimedean class bits + multiplier bits
	// h(w^x) = (sign = +, class = ..., multiplier = ...)
	public static ORD_HASH_MULTIPLIER_BITS = 8n;
	public static ORD_HASH_MAX_MULTIPLIER =
		(1n << this.ORD_HASH_MULTIPLIER_BITS) - 1n;

	static #ordHashClamp = (x: bigint, threshold: bigint): bigint => {
		if (x > threshold) {
			return threshold;
		}
		if (x < -threshold) {
			return -threshold;
		}
		return x;
	};

	/**
	 * Get the ordering hash code, which is a number.
	 */
	public get ordHash(): bigint {
		// return 0n;
		if (typeof this.#ordHash === "bigint") {
			return this.#ordHash;
		}

		if (this.isZero) {
			this.#ordHash = 0n;
			return 0n;
		}

		const [p0, c0] = this.#terms[0];
		const isReal = Conway.isZero(p0);
		const hashAC = Conway.ensure(p0).ordHash;
		const D = 256n;
		const hashACAdj = hashAC <= -D ? 1n : hashAC + D + 1n;
		const isNeg = realIsNegative(c0);
		const sign = isNeg ? -1n : 1n;
		const d0 = !isReal
			? Dyadic.ONE
			: isNeg
				? dyadicNeg(realToDyadic(c0))
				: realToDyadic(c0);
		const h =
			sign *
			((hashACAdj << Conway.ORD_HASH_MULTIPLIER_BITS) +
				Conway.#ordHashClamp(
					dyadicOrdHash(d0),
					Conway.ORD_HASH_MAX_MULTIPLIER,
				));
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

	public static isZero(value: Conway0): boolean {
		return (
			(value instanceof Dyadic && value.isZero) ||
			value === 0 ||
			value === 0n ||
			(value instanceof Conway && value.isZero)
		);
	}

	public static isOne(value: Conway0): boolean {
		return (
			(value instanceof Dyadic && value.isOne) ||
			value === 1 ||
			value === 1n ||
			(value instanceof Conway && value.isOne)
		);
	}

	public static isNegOne(value: Conway0): boolean {
		return (
			(value instanceof Dyadic && value.isNegOne) ||
			value === -1 ||
			value === -1n ||
			(value instanceof Conway && value.isNegOne)
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
		if (value instanceof Dyadic) {
			return value.isInteger && !value.isNegative;
		}

		return (
			(typeof value === "bigint" && value >= 0n) ||
			(typeof value === "number" && value >= 0 && Number.isInteger(value)) ||
			(value instanceof Conway && value.isOrdinal)
		);
	}

	public static realValue(value: Conway0): null | Real {
		return value instanceof Conway ? value.realValue : value;
	}

	public static eqHash(value: Conway0): number {
		if (value instanceof Conway) {
			return value.eqHash;
		}
		return realEqHash(value);
	}

	// #endregion
	// #region Collection

	/**
	 * Get a frozen view of the terms, which is an array of `[power, coeff]` tuples.
	 */
	public get terms() {
		return this.#terms;
	}

	public get length(): number {
		return this.#terms.length;
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
		return Conway.create(this.#terms.filter(([p, c]) => f(p, c)));
	}
	// #endregion
	// #region Conversion
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

	public compare(other: Conway, _noHash = false): -1 | 0 | 1 {
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
			const [p1, c1] = this.#terms[i] ?? [0, 0];
			const [p2, c2] = other.#terms[i] ?? [0, 0];
			if (!realEq(c1, c2)) {
				return false;
			}

			if (!Conway.eq(p1, p2)) {
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
	): -1 | 0 | 1 {
		if (left === right) {
			return 0;
		}
		if (!(left instanceof Conway) && !(right instanceof Conway)) {
			return realCompare(left, right);
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
			return realEq(left, right);
		}

		return Conway.ensure(left).eq(Conway.ensure(right));
	}
	// #endregion
}
