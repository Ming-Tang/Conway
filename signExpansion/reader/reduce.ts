import type { Ord0 } from "../../conway";
import { gt, isZero, lt } from "../../op/comparison";
import { ordinalRightSub } from "../../op/ordinal";
import { commonPrefix, countSigns } from "./split";
import {
	IterReader,
	iterSignExpansionReader,
	type Entry,
	type SignExpansionReader,
} from "./types";

/**
 * Given an unreduced sign expansion (`child`) and a sign expansion
 * to reduce againt (`parent`), generates the reduced sign expansion
 * of `child`.
 *
 * The concept of "reduced" sign expansions is explained in the
 * proof of [Gonshor] Theorem 5.12.
 * The "the last minus is discarded" subrule is not implemented
 * because non-dyadic coefficients are not supported by this
 * representation.
 *
 * Precondition: `child < parent`.
 * @param child The unreduced sign expansion
 * @param parent The unreduced sign expansion to reduce against.
 * @see `unreduceSignExpansion` for the inverse
 */
export function* reduceSignExpansion<O extends Ord0 = Ord0>(
	child: SignExpansionReader<O>,
	parent: SignExpansionReader<O>,
) {
	const shared = commonPrefix(parent, child);
	const reader = new IterReader(shared);
	const nPlus = countSigns(reader, true);
	if (typeof reader.returnValue !== "undefined" && reader.returnValue !== 1) {
		throw new RangeError("child < parent must be true");
	}
	yield { sign: true, length: nPlus } as Entry<O>;
	return yield* iterSignExpansionReader(child);
}

/**
 * Given a reduced sign expansion (`child`) and an unreduced
 * sign expansion reduceed againt (`parent`), generates the
 * unreduced sign expansion of `child`.
 *
 * The concept of "reduced" sign expansions is explained in the
 * proof of [Gonshor] Theorem 5.12.
 * The "the last minus is discarded" subrule is not implemented
 * because non-dyadic coefficients are not supported by this
 * representation.
 *
 * @param child The reduced sign expansion
 * @param parent The unreduced sign expansion to unreduce against
 * @see `unreduceSignExpansion` for the inverse
 */
export function* unreduceSignExpansion<O extends Ord0 = Ord0>(
	reducedChild: SignExpansionReader<O>,
	parent: SignExpansionReader<O>,
) {
	const entry0 = reducedChild.lookahead();
	const entry0Parent = parent.lookahead();
	if (entry0Parent === null) {
		// [S] || [] = [S]
		yield* iterSignExpansionReader(reducedChild);
		return;
	}

	if (entry0 === null) {
		const { sign, length } = entry0Parent;
		if (sign) {
			// [] || [+S] = []
			return;
		}

		parent.consume(length);
		// [] || [-^k S] = [-^k]
		yield {
			length: length as O,
			sign: false,
		};
		return;
	}

	// too many (or same) leading pluses as number of pluses in parent
	// [+^(k + d) S] || [C] = [C +^d S]
	// too few leading pluses
	// [+^k S] || [C P] = [C S]
	let remain = entry0.sign ? entry0.length : (0n as O);
	for (const { sign, length } of iterSignExpansionReader(parent)) {
		if (!sign) {
			yield { sign, length };
			continue;
		}

		if (isZero(remain)) {
			break;
		}

		if (gt(length, remain)) {
			// length > remain
			reducedChild.consume(remain);
			yield { sign, length: remain };
			remain = 0n as O;
			break;
		}

		// length <= remain
		yield { sign, length };
		reducedChild.consume(length);
		remain = ordinalRightSub(length, remain) as O;
	}

	yield* iterSignExpansionReader(reducedChild);
}

/**
 * Given a sequence of unreduced sign expansions of the exponents
 * in a term list, returns the reduced sign expansions of them
 * in the context of previous terms.
 *
 * The concept of "reduced" sign expansions is explained in the
 * proof of [Gonshor] Theorem 5.12.
 * The "the last minus is discarded" subrule is not implemented
 * because non-dyadic coefficients are not supported by this
 * representation.
 * @param unreduced The list of unreduced sign expansions
 * @see `unreduceMulti` for the inverse
 */
export const reduceMulti = <O extends Ord0 = Ord0>(
	unreduced: Entry<O>[][],
): Entry<O>[][] => {
	if (unreduced.length === 0 || unreduced.length === 1) {
		return [...unreduced];
	}

	const reduced = [unreduced[0]];
	for (let i = 1; i < unreduced.length; i++) {
		const x = unreduced[i];
		let longest: O = 0n as O;
		let xo: Entry<O>[] = [];
		for (let j = 0; j < i; j++) {
			const prefixLen = countSigns(
				new IterReader(
					commonPrefix(new IterReader(x), new IterReader(unreduced[j])),
				),
			) as O;
			if (lt(prefixLen, longest)) {
				continue;
			}

			longest = prefixLen;
			xo = [
				...reduceSignExpansion<O>(
					new IterReader(x),
					new IterReader(unreduced[j]),
				),
			];
		}
		reduced.push(xo);
	}
	return reduced;
};

/**
 * Given a sequence of reduced sign expansions of the exponents
 * in a term list, returns the unreduced sign expansions of them
 * in the context of previous terms.
 *
 * The concept of "reduced" sign expansions is explained in the
 * proof of [Gonshor] Theorem 5.12.
 * The "the last minus is discarded" subrule is not implemented
 * because non-dyadic coefficients are not supported by this
 * representation.
 * @param reduced The list of reduced sign expansions
 * @see `reduceMulti` for the inverse
 */
export const unreduceMulti = <O extends Ord0 = Ord0>(
	reduced: Entry<O>[][],
): Entry<O>[][] => {
	if (reduced.length === 0 || reduced.length === 1) {
		return [...reduced];
	}

	const unreduced: Entry<O>[][] = [reduced[0]];
	for (let i = 1; i < reduced.length; i++) {
		const xo = reduced[i];
		let longest: O = 0n as O;
		let x: Entry<O>[] = [];
		for (let j = 0; j < i; j++) {
			const x1 = [
				...unreduceSignExpansion<O>(
					new IterReader(xo),
					new IterReader(unreduced[j]),
				),
			];
			const prefixLen = countSigns(
				new IterReader(
					commonPrefix(new IterReader(x1), new IterReader(unreduced[j])),
				),
			) as O;
			if (lt(prefixLen, longest)) {
				continue;
			}

			longest = prefixLen;
			x = x1;
		}
		unreduced.push(x);
	}
	return unreduced;
};
