import type { Ord } from "../conway";
import { ensure, mono1, unit, zero } from "../op";
import { ge, gt, isAboveReals, isOne, isZero } from "../op/comparison";
import { realToNumber } from "../real";
import { cnfOrDefault, defaultCnf, simplifyConcat, simplifyCycle } from "./cnf";
import {
	defaultExpansion,
	expandOrDefault,
	getFirst,
	NotExpanded,
	SeqExpansion,
	type ExpansionEntryConstructor,
} from "./expansion";
import {
	assertLength,
	isConstantLength,
	ordFromNumber,
	isConstantArray,
	ensureFinite,
	modifiedDivRem,
} from "./helpers";
import type { Cnf, Seq } from "./types";

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

	cnf(_terms: number): Cnf<T> {
		return [];
	}

	expand(_terms: number): SeqExpansion<T> {
		return SeqExpansion.empty as SeqExpansion<T>;
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

	cnf(_terms: number): Cnf<T> {
		if (isOne(this.length)) {
			return [this.constant];
		}

		return {
			cycle: [this.constant],
			times: this.length,
			length: this.length,
		};
	}

	expand(_terms: number): SeqExpansion<T> {
		return SeqExpansion.constant(this.constant, this.length);
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

	expand(terms: number): SeqExpansion<T> {
		return SeqExpansion.mono(this.array.slice(0, terms)).withLength(
			this.length,
		);
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

	cnf(_terms: number): Cnf<T> {
		const times = ensure(
			this.length.isAboveReals
				? this.length
				: Math.ceil(realToNumber(this.length.realPart) / this.array.length),
		);
		return simplifyCycle({
			cycle: this.array,
			times,
			length: this.length,
		});
	}

	expand(_terms: number): SeqExpansion<T> {
		const times = ensure(
			this.length.isAboveReals
				? this.length
				: Math.ceil(realToNumber(this.length.realPart) / this.array.length),
		);
		return SeqExpansion.mono(this.array, times).withLength(this.length);
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

	cnf(terms: number): Cnf<T> {
		const concat: Cnf<T>[] = [];
		for (const cnf of [
			cnfOrDefault(this.left, terms),
			cnfOrDefault(this.right, terms),
		]) {
			if ("concat" in cnf && Array.isArray(cnf.concat)) {
				for (const c of cnf.concat) {
					concat.push(c);
				}
			} else {
				concat.push(cnf);
			}
		}

		return simplifyConcat({ concat, length: this.length });
	}

	expand(terms: number): SeqExpansion<T> {
		return SeqExpansion.concat(
			expandOrDefault(this.left, terms),
			expandOrDefault(this.right, terms),
		).withLength(this.length);
	}
}

export class LeftTruncate<T> implements Seq<T> {
	readonly _type = "LeftTruncate";
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

	cnf(terms: number): Cnf<T> {
		return {
			cycle: cnfOrDefault(this.seq, terms),
			times: this.multiplier,
			length: this.length,
		};
	}

	expand(terms: number): SeqExpansion<T> {
		return SeqExpansion.mono(expandOrDefault(this.seq, terms), this.multiplier);
	}
}

const cnfMapRecursive = <A, B>(cnf0: Cnf<A>, func: (value: A) => B): Cnf<B> => {
	if (Array.isArray(cnf0)) {
		return cnf0.map(func);
	}
	const { length } = cnf0;
	if ("concat" in cnf0) {
		return {
			concat: cnf0.concat.map((c) => cnfMapRecursive(c, func)),
			length,
		};
	}

	const { times } = cnf0;
	if ("cycle" in cnf0) {
		return {
			cycle: cnfMapRecursive(cnf0.cycle, func),
			times,
			length,
		};
	}

	throw new Error("cnfMapRecursive: invalid case");
};

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

	cnf(terms: number): Cnf<[A, B]> {
		const left: Cnf<A> = cnfOrDefault(this.left, terms);
		const right: B[] = defaultCnf(this.right, terms).concat[0];
		const concat = right.map((b) =>
			cnfMapRecursive(left, (a) => [a, b] as [A, B]),
		);

		return simplifyConcat({
			concat,
			length: this.length,
		});
	}

	expand(terms: number): SeqExpansion<[A, B]> {
		const left: SeqExpansion<A> = expandOrDefault(this.left, terms);
		const right: B[] = defaultExpansion(this.right, terms).elems;
		const concat = right.map((b) => left.map((a) => [a, b] as [A, B]));
		return concat
			.reduce((s, a) => SeqExpansion.concat(s, a), SeqExpansion.empty)
			.withLength(this.length);
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

	cnf(terms: number): Cnf<B> {
		const cnf0 = cnfOrDefault(this.seq, terms);
		return cnfMapRecursive(cnf0, this.func);
	}

	expand(terms: number): SeqExpansion<B> {
		return expandOrDefault(this.seq, terms).map(this.func);
	}
}

const indexByPowerPrefix = <T>(
	seq: Seq<T>,
	terms: number,
	initIndex = zero as Ord,
) => {
	const concat: ExpansionEntryConstructor<T>[] = [];
	let index = initIndex;
	for (let i = 0; i < terms; i++) {
		if (ge(index, seq.length)) {
			break;
		}
		const dLen = mono1(i);
		concat.push([[seq.index(index)], dLen]);
		index = index.add(dLen);
	}
	return new SeqExpansion<T>(concat, mono1(seq.length));
};

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

	cnf(terms: number): Cnf<T> {
		const concat: Cnf<T>[] = [];
		let index = zero as Ord;
		for (let i = 0; i < terms; i++) {
			if (ge(index, this.length)) {
				break;
			}
			const dLen = mono1(i);
			concat.push(
				simplifyCycle({
					cycle: [this.index(index)],
					times: dLen,
					length: dLen,
				}),
			);
			index = index.add(dLen);
		}

		return simplifyConcat({ concat, length: this.length });
	}

	expand(terms: number): SeqExpansion<T> {
		if (!this.seq.expand) {
			return indexByPowerPrefix(this, terms);
		}

		let combined: SeqExpansion<T> = SeqExpansion.empty;
		for (const e of this.seq.expand(terms).entries) {
			const first = getFirst(e.seq);
			if (e.isConstant && first !== NotExpanded) {
				combined = SeqExpansion.concat(
					combined,
					SeqExpansion.constant(first, mono1(e.partialUpper)),
				);
				continue;
			}

			if (Array.isArray(e.seq)) {
				combined = SeqExpansion.concat(
					combined,
					indexByPowerPrefix<T>(new FromArray(e.seq), terms, e.partialLen),
				);
				continue;
			}

			combined = SeqExpansion.concat(
				combined,
				indexByPowerPrefix<T>(
					new LeftTruncate<T>(e.partialLen, e.seq as never),
					terms,
					e.partialLen,
				),
			);
		}
		return combined.withLength(this.length);
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

	cnf(terms: number) {
		const elems = defaultCnf(this.seq, terms).concat[0];
		const concat = elems.map((e) =>
			simplifyCycle({
				cycle: [e],
				times: this.multiplier,
				length: this.multiplier,
			}),
		);
		return simplifyConcat({ concat, length: this.length });
	}

	expand(terms: number): SeqExpansion<T> {
		const elems = defaultCnf(this.seq, terms).concat[0];
		const concat = elems.map(
			(e) => [[e], this.multiplier] as ExpansionEntryConstructor<T>,
		);
		return new SeqExpansion(concat, this.length);
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
