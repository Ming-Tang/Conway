import type { Conway0, Ord, Ord0 } from "../conway";
import { zero, ensure } from "../op";
import { lt } from "../op/comparison";
import { ordinalRightSub } from "../op/ordinal";
import type { Seq } from "../seq";
import { assertLength } from "../seq/helpers";

/**
 * An entry in the sign expansion of a surreal number.
 * which consists of the `sign`
 * and the `length` for the ordinal number of repetitions.
 */

export interface SignExpansionElement<V = Conway0> {
	/** The sign: `false` for minus and `true` for plus. */
	sign: boolean;
	/** How many times this sign is repeated consecutively (ordinal number). */
	length: Ord0;
	initValue: V;
	finalValue: V;
	omitted?: unknown;
	omittedBy?: V;
} /**
 * An entry in the normalized sign expansion.
 */

export interface NormalizeSignExpansionElement<V = Conway0>
	extends SignExpansionElement<V> {
	/** The inclusive minimum index of the consecutive block of signs. */
	min: Ord0;
	/** The exclusive maximum index of the consecutive block of signs. */
	max: Ord0;
}

export class SignExpansionSeq implements Seq<boolean> {
	readonly #elems: SignExpansionElement[];
	readonly length: Ord;
	readonly isConstant: boolean;

	public constructor(
		iter: SignExpansionElement[] | Iterable<SignExpansionElement>,
	) {
		this.#elems = [...iter];
		this.length = this.#elems.reduce(
			(s, { length }) => s.ordinalAdd(length),
			zero,
		);
		const hasMinus = this.#elems.some(({ sign }) => !sign);
		const hasPlus = this.#elems.some(({ sign }) => sign);
		this.isConstant = !(hasPlus && hasMinus);
	}

	public index(index: Ord): boolean {
		assertLength(index, this.length);
		let d: Ord = index;
		for (const { sign, length: dl } of this.#elems) {
			if (lt(d, dl)) {
				return sign;
			}
			d = ensure(ordinalRightSub(dl, d)) as Ord;
		}
		throw new Error("out of bounds");
	}
}
