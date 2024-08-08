import type { Conway } from "../conway";
import { ensure, one, unit, zero } from "../op";
import { ge, isAboveReals, isZero } from "../op/comparison";
import { ordinalDivRem } from "../op/ordinal";

export type Ord = Conway;

/**
 * Interface for a transfinite sequence, which is a sequence of a
 * transfinite length (`length`) and is indexed by ordinal numbers (`index`).
 */
export interface Seq<T> {
	length: Ord;
	index: (index: Ord) => T;
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
	constructor() {
		this.length = zero;
	}

	index(_: Ord): T {
		throw new RangeError("empty sequence");
	}
}

export class Constant<T = unknown> implements Seq<T> {
	readonly _type = "Constant";
	constructor(
		readonly constant: T,
		readonly length: Ord,
	) {}

	index(i: Ord): T {
		assertLength(i, this.length);
		return this.constant;
	}
}

export class Identity implements Seq<Ord> {
	readonly _type = "Identity";
	constructor(readonly length: Ord) {}

	index(i: Ord): Ord {
		assertLength(i, this.length);
		return i;
	}
}

export class FromArray<T> implements Seq<T> {
	readonly _type = "FromArray";
	readonly length: Ord;
	constructor(private readonly array: T[]) {
		this.length = ordFromNumber(array.length);
	}
	index(i: Ord) {
		assertLength(i, this.length);
		return this.array[ensureFinite(i)];
	}
}

export class CycleArray<T> implements Seq<T> {
	readonly _type = "CycleArray";
	readonly length: Ord;
	constructor(private readonly array: T[]) {
		if (array.length === 0) {
			this.length = zero;
		} else {
			this.length = unit;
		}
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
	constructor(
		private readonly left: Seq<T>,
		private readonly right: Seq<T>,
	) {
		this.length = left.length.ordinalAdd(right.length);
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

export class Cycle<T> implements Seq<T> {
	readonly _type = "Cycle";
	readonly length: Ord;
	constructor(
		private readonly seq: Seq<T>,
		private readonly multiplier = unit,
	) {
		const n = seq.length;
		if (isZero(n)) {
			this.length = zero;
		} else if (n.isAboveReals) {
			this.length = seq.length.ordinalMult(this.multiplier);
		} else {
			this.length = this.multiplier;
		}
	}

	index(i: Ord) {
		assertLength(i, this.length);
		const [, r0] = ordinalDivRem(i, this.seq.length);
		const r = ensure(r0);
		if (ge(r, this.seq.length)) {
			if (isAboveReals(this.length) && !isAboveReals(this.seq.length)) {
				// Handling finite * infinite: divide out the infinite part and use finite remainder
				const r1 = ordinalDivRem(i, unit)[1];
				const r2 = ordinalDivRem(r1, this.seq.length)[1];
				return this.seq.index(ensure(r2));
			}
			throw new RangeError(
				`Remainder is too large. |seq| = ${this.seq.length}, mult=${this.multiplier}, len=${this.length}, index=${i}, remainder = ${r}`,
			);
		}

		return this.seq.index(ensure(r));
	}
}

export const fromArray = <T>(xs: T[]): Seq<T> => new FromArray(xs);

export const concat = <T>(f: Seq<T>, g: Seq<T>): Seq<T> => new Concat(f, g);

export const cycleArray = <T>(xs: T[]): Seq<T> => new CycleArray(xs);

export const cycle = <T>(f: Seq<T>, n = one): Seq<T> => new Cycle(f, n);

export const empty = Empty.instance;
