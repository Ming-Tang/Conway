import type { Conway } from "../conway";
import type { SeqExpansion } from "./expansion";

export type Ord = Conway;

export type CnfArray<T> = T[];

export type CnfConcat<T> = {
	concat: Cnf<T>[];
	length: Ord;
};

export type CnfCycle<T> = {
	cycle: Cnf<T>;
	times: Ord;
	length: Ord;
};

/**
 * Concat normal form (CNF).
 * A human-readable expansion of a transfinite sequence, which is one of:
 * - Array
 * - Concat of a list of CNF terms
 * - Cycle (repeat) of a CNF term by a particular ordinal number of times
 * - Repeat each of a CNF term by a particular ordinal number of times
 */
export type Cnf<T> = CnfArray<T> | CnfConcat<T> | CnfCycle<T>;

/**
 * Interface for a transfinite sequence, which is a sequence of a
 * transfinite length (`length`) and is indexed by ordinal numbers (`index`).
 */
export interface Seq<T> {
	/**
	 * The length, or order type of the transfinite sequence.
	 *
	 * Notation given transfinite sequence `f`: `|f|`
	 */
	readonly length: Ord;

	/**
	 * Given an index, return the element at the index.
	 *
	 * Notation for the `i`th element of sequence `f`: `f[i]`
	 * @param i ndex The index in ordinal number, must be less than `length`.
	 * @throws An exception if the index is out of bounds.
	 */
	index: (index: Ord) => T;

	/**
	 * True if all elements of this sequence are the same (or empty/singleton).
	 * False otherwise or cannot be properly determined.
	 * Used by "constant folding" procedures to simplify the sequence.
	 */
	readonly isConstant: boolean;

	/**
	 * Get the concat normal form expansion of this sequence.
	 * @param terms The maximum number of CNF terms to expand for each sub-expression.
	 */
	cnf?: (terms: number) => Cnf<T>;

	/**
	 * Get the expansion of this sequence.
	 * @param terms The maximum number of terms to expand for each sub-expression.
	 */
	expand?: (terms: number) => SeqExpansion<T>;
}
