import { Conway } from "../conway";
import { ensure } from "../op";

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
		throw new RangeError("index is not an ordinal number");
	}
	if (Conway.ge(index, length)) {
		throw new RangeError("index out of bounds");
	}
};

const minus = (higher: Ord, lower: Ord) => lower.ordinalRightSub(higher);

export class Empty<T = unknown> implements Seq<T> {
	static instance: Empty<unknown> = new Empty();
	readonly length: Ord;
	constructor() {
		this.length = Conway.zero;
	}

	index(_: Ord): T {
		throw new RangeError("empty sequence");
	}
}

export class Constant<T = unknown> implements Seq<T> {
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
	constructor(readonly length: Ord) {}

	index(i: Ord): Ord {
		assertLength(i, this.length);
		return i;
	}
}

export class FromArray<T> implements Seq<T> {
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
	readonly length: Ord = Conway.unit;
	constructor(private readonly array: T[]) {}

	index(i: Ord) {
		assertLength(i, this.length);
		const v = ensureFinite(i);
		return this.array[v % this.array.length];
	}
}

export class Cycle<T> implements Seq<T> {
	readonly length: Ord;
	constructor(private readonly seq: Seq<T>) {
		this.length = seq.length.mult(Conway.unit);
	}

	index(i: Ord) {
		assertLength(i, this.length);
		const n = this.seq.length;
		let d = i;
		while (Conway.ge(d, n)) {
			d = minus(d, n);
		}
		return this.seq.index(d);
	}
}

export class Concat<T> implements Seq<T> {
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
		if (Conway.ge(i, fl)) {
			const d = minus(i, fl);
			return this.right.index(d);
		}
		return this.left.index(i);
	}
}

export const fromArray = <T>(xs: T[]): Seq<T> => new FromArray(xs);

export const concat = <T>(f: Seq<T>, g: Seq<T>): Seq<T> => new Concat(f, g);

export const cycleArray = <T>(xs: T[]): Seq<T> => new CycleArray(xs);

export const cycle = <T>(f: Seq<T>): Seq<T> => new Cycle(f);

export const empty = Empty.instance;
