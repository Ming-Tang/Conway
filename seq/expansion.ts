import { cycle, cycleArray } from ".";
import { ensure, zero } from "../op";
import { ge, gt, isOne, isZero, lt, ne } from "../op/comparison";
import { ordinalMult } from "../op/ordinal";
import { assertLength, isConstantArray } from "./helpers";
import type { Ord, Seq } from "./types";

export const NotExpanded = Symbol("NotExpanded");

/**
 * A `[subseq, cycleReps]` pair.
 */
export type ExpansionEntryConstructor<T> = [SeqExpansion<T> | T[], Ord];

export interface ExpansionEntry<T> {
	readonly seq: SeqExpansion<T> | T[];
	readonly length: Ord;
	readonly repeat: Ord;
	readonly isConstant: boolean;
	/**
	 * Total length of the `ExpansionEntry`s before it, excluding itself.
	 */
	readonly partialLen: Ord;
	readonly partialUpper: Ord;
}

const ensureSeq = <T>({
	seq,
	repeat,
	length,
}: ExpansionEntry<T>): Seq<T | typeof NotExpanded> => {
	if (Array.isArray(seq)) {
		return cycleArray(seq, length);
	}

	return cycle(seq, repeat);
};

const inspectEntry = <T>([subseq, cr]: ExpansionEntryConstructor<T>): {
	len: Ord;
	hasPartial: boolean;
	isConstant: boolean;
	first: T | typeof NotExpanded;
} => {
	const len = ensure(subseq.length).ordinalMult(cr);
	const hasPartial = Array.isArray(subseq) ? false : subseq.isPartial;
	const first: T | typeof NotExpanded = Array.isArray(subseq)
		? subseq[0]
		: subseq.index(zero);
	const isConstant =
		isOne(len) ||
		(Array.isArray(subseq) ? isConstantArray(subseq) : subseq.isConstant);
	return { len, hasPartial, first, isConstant };
};

const canMergeEntry = <T>(
	constValue: T,
	newEntry: ExpansionEntryConstructor<T>,
) => {
	const { len, isConstant, first } = inspectEntry(newEntry);
	if (isZero(len) || first === NotExpanded) {
		return true;
	}
	return isConstant && constValue === first;
};

const convertEntry = <T>(c: ExpansionEntry<T>): ExpansionEntryConstructor<T> => (
	[c.seq, c.repeat]
);

function *flattenSeqExpansion<T>(entries: Iterable<ExpansionEntryConstructor<T>>): Iterable<ExpansionEntryConstructor<T>> {
	for (const e of entries) {
		const [subseq, cr] = e;
		if (isZero(subseq.length) || isZero(cr)) {
			continue;
		}

		if (Array.isArray(subseq)) {
			if (subseq.length > 0) {
				yield [subseq, cr];
			}
			continue;
		}

		if (isOne(cr)) {
			for (const e of subseq.entries) {
				yield* flattenSeqExpansion([convertEntry(e)]);
			}
			continue;
		}

		yield [subseq, cr];
	}
}

/**
 * A restricted form of transfinite sequences that can be expressed
 * in terms of an array of `[subseq[i], reps[i]]` pairs.
 * The entire `SeqExpansion` represents the sequence constructed by
 * `cycle(subseq[0], reps[0]) & cycle(subseq[1], reps[1]) & ...`.
 *
 * It is possible to represent a partial sequence (`this.isPartial`)
 * with the first `n` terms expanded.
 *
 * If a not-expanded term is being indexed (`.index`), a symbol
 * `NotExpanded` will be returned instead.
 *
 */
export class SeqExpansion<T> implements Seq<T | typeof NotExpanded> {
	readonly isConstant: boolean;
	/**
	 * True if and only if this se quence contains unexpanded elements (`totalLength < length`).
	 */
	readonly isPartial: boolean;
	readonly totalLength: Ord;
	readonly length: Ord;
	readonly entries: ExpansionEntry<T>[];

	public constructor(
		/**
		 * The nominal length of this sequence.
		 */
		entries?:
			| ExpansionEntryConstructor<T>[]
			| Iterable<ExpansionEntryConstructor<T>>,
		length: Ord | undefined = undefined,
	) {
		this.isConstant = false;
		this.entries = [];
		let totalLen = zero;
		let hasPartial = false;
		let hasNonConstant = false;
		const entriesMerged: ExpansionEntryConstructor<T>[] = [];
		let i = 0;
		const entriesArr = [...flattenSeqExpansion(entries ?? [])];
		while (i < entriesArr.length) {
			const [subseq, cr] = entriesArr[i];

			const { len, first, isConstant } = inspectEntry([subseq, cr]);
			if (!isConstant || first === NotExpanded) {
				entriesMerged.push([subseq, cr]);
				i++;
				continue;
			}

			let j = i + 1;
			let totalLen = len;
			while (j < entriesArr.length) {
				if (!canMergeEntry(first, entriesArr[j])) {
					break;
				}
				totalLen = totalLen.ordinalAdd(inspectEntry(entriesArr[j]).len);
				j++;
			}
			entriesMerged.push([[first], totalLen]);
			i = j;
		}

		for (const [subseq, cr] of entriesMerged) {
			const {
				len,
				hasPartial: hasPartial1,
				first,
				isConstant,
			} = inspectEntry([subseq, cr]);
			hasPartial ||= hasPartial1;
			if (isConstant && first !== NotExpanded) {
				this.entries.push({
					seq: [first],
					repeat: len,
					isConstant: true,
					length: len,
					partialLen: totalLen,
					partialUpper: totalLen.ordinalAdd(len),
				});
				totalLen = totalLen.ordinalAdd(len);
				continue;
			}

			hasNonConstant = true;
			this.entries.push({
				seq: subseq,
				repeat: cr,
				isConstant: false,
				length: ensure(len),
				partialLen: totalLen,
				partialUpper: totalLen.ordinalAdd(len),
			});
			totalLen = totalLen.ordinalAdd(len);
		}

		this.length = totalLen ?? length;
		this.totalLength = totalLen;
		if (gt(this.totalLength, this.length)) {
			throw new RangeError(
				`Total length of the constructed sequence is greater than the provided length.: ${this.totalLength} > ${this.length}`,
			);
		}

		this.isPartial = hasPartial || ne(this.length, this.totalLength);
		if (!this.isPartial && isZero(this.length)) {
			this.isConstant = true;
		}
		this.isConstant = !hasNonConstant && !hasPartial;
	}

	index(index: Ord): T | typeof NotExpanded {
		assertLength(index, this.length);
		if (ge(index, this.totalLength)) {
			return NotExpanded;
		}

		for (const e of this.entries) {
			if (ge(index, e.partialUpper)) {
				continue;
			}

			const partialIndex = e.partialLen.ordinalRightSub(index);
			const s = ensureSeq(e);
			return s.index(partialIndex);
		}
		throw new Error("index: out of range");
	}

	get isEmpty() {
		return isZero(this.length);
	}
}
