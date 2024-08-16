import type { Conway } from "../conway";

export type Ord = Conway;

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
}
