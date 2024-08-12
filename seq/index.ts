import type { Conway } from "../conway";
import { ensure, mono1, one, unit, zero } from "../op";
import { ge, gt, isAboveReals, isZero, le } from "../op/comparison";
import { ordinalDivRem } from "../op/ordinal";

export type Ord = Conway;

/**
 * Interface for a transfinite sequence, which is a sequence of a
 * transfinite length (`length`) and is indexed by ordinal numbers (`index`).
 */
export interface Seq<T> {
	length: Ord;
	index: (index: Ord) => T;

	/**
	 * True if all elements of this sequence are the same (or empty/singleton).
	 * False otherwise or cannot be properly determined.
	 */
	readonly isConstant: boolean;
}

// @ts-expect-error
export const ensureOrd = (x: Conway): x is Ord<Conway> => {
	return x.isOrdinal;
};

export const ordFromNumber = (x: number) => {
	return ensure(x) as Ord;
};

const ensureFinite = (x: Ord): number => {
	const rv = x.realValue;
	if (
		rv === null ||
		rv < 0 ||
		(typeof x === "number" && !Number.isInteger(x))
	) {
		throw new RangeError("must be zero or positive integer");
	}
	return Number(x);
};

export const assertLength = (index: Ord, length: Ord) => {
	if (!index.isOrdinal) {
		throw new RangeError(`index is not an ordinal number: ${index}`);
	}
	if (ge(index, length)) {
		throw new RangeError(
			`index out of bounds, index=${index}, length=${length}`,
		);
	}
};

const minus = (higher: Ord, lower: Ord) => lower.ordinalRightSub(higher);

export class Empty<T = unknown> implements Seq<T> {
	readonly _type = "Empty";
	static instance: Empty<unknown> = new Empty();
	readonly length: Ord;
	readonly isConstant = true;
	constructor() {
		this.length = zero;
	}

	index(_: Ord): T {
		throw new RangeError("empty sequence");
	}
}

export class Constant<T = unknown> implements Seq<T> {
	readonly _type = "Constant";
	readonly isConstant = true;
	constructor(
		readonly constant: T,
		readonly length: Ord,
	) {}

	index(i: Ord): T {
		assertLength(i, this.length);
		return this.constant;
	}
}

const isConstantLength = (x: Ord) => le(x, one);
const isConstantArray = <T>(xs: T[]) => {
	if (xs.length <= 1) {
		return true;
	}
	const v = xs[0];
	for (let i = 1; i < xs.length; i++) {
		if (xs[i] !== v) {
			return false;
		}
	}
	return true;
};

export class Identity implements Seq<Ord> {
	readonly _type = "Identity";
	readonly isConstant: boolean;

	constructor(readonly length: Ord) {
		this.isConstant = isConstantLength(length);
	}

	index(i: Ord): Ord {
		assertLength(i, this.length);
		return i;
	}
}

export class MapNatural implements Seq<bigint> {
	readonly _type = "MapNatural";
	readonly isConstant: boolean;

	constructor(
		readonly func: (value: bigint) => bigint,
		readonly length = unit as Ord,
	) {
		if (gt(length, unit)) {
			throw new RangeError("Length must be either finite or w");
		}
		this.isConstant = isConstantLength(length);
	}

	index(i: Ord): bigint {
		assertLength(i, this.length);
		return this.func(BigInt(i.realPart));
	}
}

export class FromArray<T> implements Seq<T> {
	readonly _type = "FromArray";
	readonly length: Ord;
	readonly isConstant: boolean;

	constructor(private readonly array: T[]) {
		this.length = ordFromNumber(array.length);
		this.isConstant = isConstantLength(this.length) || isConstantArray(array);
	}
	index(i: Ord) {
		assertLength(i, this.length);
		return this.array[ensureFinite(i)];
	}
}

export class CycleArray<T> implements Seq<T> {
	readonly _type = "CycleArray";
	readonly isConstant: boolean;

	constructor(
		private readonly array: T[],
		public readonly length = unit,
	) {
		if (array.length === 0) {
			this.length = zero;
		}
		this.isConstant = isConstantLength(length) || isConstantArray(this.array);
	}

	index(i: Ord) {
		assertLength(i, this.length);
		const v = ensureFinite(i);
		return this.array[v % this.array.length];
	}
}

export class Concat<T> implements Seq<T> {
	readonly _type = "Concat";
	readonly length: Ord;
	readonly isConstant: boolean;

	constructor(
		private readonly left: Seq<T>,
		private readonly right: Seq<T>,
	) {
		this.length = left.length.ordinalAdd(right.length);
		if (isZero(left.length)) {
			this.isConstant = right.isConstant;
		} else if (isZero(right.length)) {
			this.isConstant = left.isConstant;
		} else {
			this.isConstant =
				left.isConstant &&
				right.isConstant &&
				left.index(zero) === right.index(zero);
		}
	}

	index(i: Ord) {
		assertLength(i, this.length);
		const fl = this.left.length;
		if (ge(i, fl)) {
			const d = minus(i, fl);
			// console.log(`(${fl}) + (${d}) = ${i}`);
			return this.right.index(d);
		}
		return this.left.index(i);
	}
}

export class LeftTruncate<T> implements Seq<T> {
	readonly _type = "Concat";
	readonly length: Ord;
	readonly isConstant: boolean;

	constructor(
		private readonly trunc: Ord,
		private readonly seq: Seq<T>,
	) {
		this.length = this.trunc.ordinalRightSub(seq.length);
		// Will not check the truncated sequence
		this.isConstant = isConstantLength(this.length) || this.seq.isConstant;
	}

	index(i: Ord) {
		assertLength(i, this.length);
		return this.seq.index(this.trunc.ordinalAdd(i));
	}
}

const modifiedDivRem = (
	i: Ord,
	leftLen: Ord,
	rightLen: Ord,
	prodLen: Ord,
): [Ord, Ord] => {
	const [q, r0] = ordinalDivRem(i, leftLen);
	const r = ensure(r0);
	if (ge(r, leftLen)) {
		if (isAboveReals(prodLen) && !isAboveReals(leftLen)) {
			// Handling finite * infinite: divide out the infinite part and use finite remainder
			const r1 = ordinalDivRem(i, unit)[1];
			const [q1, r2] = ordinalDivRem(r1, leftLen);
			return [ensure(q1), ensure(r2)];
		}
		throw new RangeError(
			`Remainder is too large. |left| = ${leftLen}, |right|=${rightLen}, |prod|=${prodLen}, index=${i}, remainder = ${r}`,
		);
	}

	return [ensure(q), r];
};

export class Cycle<T> implements Seq<T> {
	readonly _type = "Cycle";
	readonly length: Ord;
	readonly isConstant: boolean;

	constructor(
		private readonly seq: Seq<T>,
		private readonly multiplier = unit,
	) {
		const n = seq.length;
		if (isZero(n) || isZero(this.multiplier)) {
			this.length = zero;
		} else {
			this.length = n.ordinalMult(this.multiplier);
		}
		this.isConstant = seq.isConstant;
	}

	index(i: Ord) {
		assertLength(i, this.length);
		const r = modifiedDivRem(
			i,
			this.seq.length,
			this.multiplier,
			this.length,
		)[1];
		return this.seq.index(r);
	}
}

export class Product<A, B> implements Seq<[A, B]> {
	readonly _type = "Product";
	readonly length: Ord;
	readonly isConstant: boolean;

	constructor(
		private readonly left: Seq<A>,
		private readonly right: Seq<B>,
	) {
		const ll = left.length;
		const lr = right.length;
		if (isZero(ll) || isZero(lr)) {
			this.length = zero;
		} else {
			this.length = ll.ordinalMult(lr);
		}
		this.isConstant = left.isConstant && right.isConstant;
	}

	index(i: Ord) {
		assertLength(i, this.length);
		const [q, r] = modifiedDivRem(
			i,
			this.left.length,
			this.right.length,
			this.length,
		);
		return [this.left.index(r), this.right.index(q)] as [A, B];
	}
}

export class SeqMap<A, B> implements Seq<B> {
	readonly _type = "SeqMap";
	readonly length: Ord;
	readonly isConstant: boolean;
	constructor(
		private readonly seq: Seq<A>,
		private readonly func: (value: A) => B,
	) {
		this.length = this.seq.length;
		this.isConstant = seq.isConstant;
	}

	index(i: Ord) {
		return this.func(this.seq.index(i));
	}
}

export class IndexByPower<T> implements Seq<T> {
	readonly _type = "IndexByPower";
	readonly length: Ord;
	readonly isConstant: boolean;

	constructor(private seq: Seq<T>) {
		this.length = mono1(seq.length);
		this.isConstant = seq.isConstant;
	}

	index(i: Ord): T {
		assertLength(i, this.length);
		if (!isAboveReals(i)) {
			return this.seq.index(zero);
		}

		const { leadingPower: p } = i;
		return this.seq.index(ensure(p ?? 0n));
	}
}

export const fromArray = <T>(xs: T[]): Seq<T> => new FromArray(xs);

export const concat = <T>(f: Seq<T>, g: Seq<T>): Seq<T> => new Concat(f, g);

export const leftTrunc = <T>(trunc: Ord, f: Seq<T>): Seq<T> =>
	new LeftTruncate(trunc, f);

export const cycleArray = <T>(xs: T[], n = unit): Seq<T> =>
	new CycleArray(xs, n);

export const cycle = <T>(f: Seq<T>, n = one): Seq<T> => new Cycle(f, n);

export const prod = <A, B>(f: Seq<A>, g: Seq<B>): Seq<[A, B]> =>
	new Product(f, g);

export const map = <A, B>(f: Seq<A>, func: (value: A) => B): Seq<B> =>
	new SeqMap(f, func);

export const mapNatural = (
	func: (value: bigint) => bigint,
	length = unit as Ord,
) => new MapNatural(func, length);

export const indexByPower = <T>(f: Seq<T>): Seq<T> => new IndexByPower(f);

/**
 * If the sequence is constant (`isConstant`), return `empty`
 * or a `cycleArray(...)` instead.
 * Otherwise return the sequence itself.
 */
export const maybeSimplifyConst = <T>(f: Seq<T>): Seq<T> => {
	if (isZero(f.length)) {
		return empty as Seq<T>;
	}
	if (f.isConstant) {
		return cycleArray([f.index(zero)], f.length);
	}
	return f;
};

export const identity = (length: Ord) => new Identity(length);

export const empty = Empty.instance;
