import { ensure, mono1, unit, zero } from "../op";
import { ge, gt, isAboveReals, isZero } from "../op/comparison";
import {
	assertLength,
	isConstantLength,
	ordFromNumber,
	isConstantArray,
	ensureFinite,
	modifiedDivRem,
} from "./helpers";
import type { Ord, Seq } from "./types";

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

export class MapNatural<T> implements Seq<T> {
	readonly _type = "MapNatural";
	readonly isConstant: boolean;

	constructor(
		readonly func: (value: bigint) => T,
		readonly length = unit as Ord,
	) {
		if (gt(length, unit)) {
			throw new RangeError("Length must be either finite or w");
		}
		this.isConstant = isConstantLength(length);
	}

	index(i: Ord): T {
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
		return this.array[Number(i.realPart) % this.array.length];
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

export class RepeatEach<T> implements Seq<T> {
	readonly _type = "RepeatEach";
	readonly length: Ord;
	readonly isConstant: boolean;

	constructor(
		private seq: Seq<T>,
		private multiplier = unit,
	) {
		this.length = this.multiplier.ordinalMult(seq.length);
		this.isConstant = seq.isConstant;
	}

	index(i: Ord): T {
		assertLength(i, this.length);
		const [q, _] = modifiedDivRem(
			i,
			this.multiplier,
			this.seq.length,
			this.length,
		);
		return this.seq.index(ensure(q));
	}
}

export class OverrideIsConstant<T, S extends Seq<T>> implements Seq<T> {
	readonly _type = "OverrideIsConstant";
	readonly length: Ord;

	constructor(
		private seq: S,
		public readonly isConstant = true,
	) {
		this.length = this.seq.length;
	}

	index(i: Ord): T {
		return this.seq.index(i);
	}
}
