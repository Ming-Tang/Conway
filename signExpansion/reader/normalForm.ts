import { Conway, type Conway0, type Ord, type Ord0 } from "../../conway";
import { create, ensure, tryGetReal } from "../../op";
import { gt, isAboveReals, isZero } from "../../op/comparison";
import type { Real } from "../../real";
import { genMono, readMono, type SkipFirst } from "./mono";
import { genReal } from "./real";
import { reduceMulti, unreduceMulti, unreduceSingle } from "./reduce";
import { compareSignExpansions, countSigns } from "./split";
import { IterReader, type Entry, type SignExpansionReader } from "./types";

/**
 * A term in the monomial-list decomposition of a sigh expansion.
 */
export type Term = [Entry[], Real];

/**
 * Given an arbitrary sign expansion, decompose it into the monomial-list decomposition.
 * See [Gonshor] Theorem 5.11 and Theorem 5.12 for more details.
 *
 * @param reader The sign expansion reader to read from
 * @param unreduce `true` (default) to un-reduce the sign expansions of the exponents.
 * `false` to bypass un-reducing.
 * @returns The decomposed list of terms of the Conway normal form with exponents
 * represented as sign expansions and coefficients as reals.
 * Contains un-reduced exponents or raw exponents depending on the second parameter.
 * @see `composeSignExpansion` for the inverse
 */
export const decomposeSignExpansion = (
	reader: SignExpansionReader,
	unreduce = true,
) => {
	const termsReduced: Term[] = [];
	const prevUnreduced: Entry[][] = [];
	let skipFirst = null as SkipFirst | null;
	while (reader.lookahead() !== null) {
		const res = readMono(reader, skipFirst);
		skipFirst = null;

		if (res === null) {
			break;
		}

		const { mono1, real, lastSign, nPlus } = res;
		const newUnreduced = unreduceSingle(mono1, prevUnreduced);
		if (newUnreduced === null) {
			throw new Error("failed to unreduce");
		}
		prevUnreduced.push(newUnreduced);

		const next = reader.lookahead();
		if (next !== null && lastSign !== null) {
			const { sign: nextSign, length: nextLen } = next;
			const terms1 = ensure<Ord0>(nextLen).getTerms();
			const nextMono1 = terms1.length === 0 ? 0n : (terms1[0][0] as Ord0);

			const proposedReduced: Entry[] = [{ sign: true, length: nextMono1 }];
			const currentUnreduced = prevUnreduced[prevUnreduced.length - 1];
			const proposedUnreduced = unreduceSingle(proposedReduced, prevUnreduced);

			// Are we in a segment of [+^(w^b) -^(w^c)] or [-^(w^b) +^(w^c)]?
			// where the next mono1 can overtake the current term?
			// The `+^(w^b)` or `-^(w^b)` must be part of a real part and it
			// has already been parsed by the previous term.
			if (
				proposedUnreduced === null ||
				(compareSignExpansions(
					new IterReader(currentUnreduced),
					new IterReader(proposedUnreduced),
				) !== -1 &&
					lastSign.sign !== nextSign)
			) {
				// if (lastSign.sign === nextSign) {
				// 	console.error("invalid parser state", {
				// 		prevMono1: mono1,
				// 		nextMono1: [{sign: true, length: nextMono1 }],
				// 		lastSign,
				// 		nextSign,
				// 	});
				// 	throw new Error(
				// 		"invalid parser state: [+^finite +^infinite] or [-^finite -^infinite]",
				// 	);
				// }

				// console.log("skipping real part contribution", {
				// 	mono1: mono1,
				// 	nextMono1: [{ sign: true, length: nextMono1 }],
				// 	nPlus,
				// 	termIndex: termsReduced.length,
				// });
				termsReduced.push([mono1, lastSign.value]);
				skipFirst = { sign: lastSign.sign, exponent: nPlus };
				continue;
			}
		}

		termsReduced.push([mono1, real]);
	}

	if (!unreduce) {
		return termsReduced;
	}

	return termsReduced.map(([_, r], i): Term => [prevUnreduced[i], r]);
};

/**
 * Given a list of terms with reduced or non-reduced exponents, generate
 * the sign expansion of the overall Conway normal form.
 * See [Gonshor] Theorem 5.11 and Theorem 5.12 for more details.
 * The concept of "reduced" sign expansions is explained in the proof of Theorem 5.12.
 * @param terms The list of terms
 * @param reduce `true` (default) to reduce the sign expansions of the exponents before
 * generating the sign expansion. `false` to bypass reducing.
 * @returns
 * @see `dwcomposeSignExpansion` for the inverse
 */
export function* composeSignExpansion(terms: Iterable<Term>, reduce = true) {
	if (!reduce) {
		for (const [mono1, real] of terms) {
			yield* genMono({ mono1: new IterReader(mono1), real });
		}
		return;
	}

	let i = 0;
	const prev: Entry[][] = [];
	for (const [m1, real] of terms) {
		const reduced = i === 0 ? m1 : reduceMulti([...prev, m1])[i];
		yield* genMono({ mono1: new IterReader(reduced), real });
		prev.push(m1);
		i++;
	}
}

export const decomposeSignExpansionFromConway = (conway: Conway): Term[] => {
	return conway
		.getTerms()
		.map(([p, r]) => [[...signExpansionFromConway(p)], r]);
};

export function* signExpansionFromConway(conway: Conway0) {
	if (isZero(conway)) {
		return;
	}

	const realValue = tryGetReal(conway);
	if (!(realValue instanceof Conway)) {
		yield* genReal(realValue, false);
		return;
	}

	const terms: Term[] = decomposeSignExpansionFromConway(realValue);
	yield* composeSignExpansion(terms, true);
}

export const conwayFromSignExpansion = (
	reader: SignExpansionReader,
): Conway0 => {
	if (reader.lookahead() === null) {
		return 0n;
	}

	const decomposed = decomposeSignExpansion(reader);
	const terms: [Conway0, Real][] = decomposed.map(([p, r]) => {
		return [conwayFromSignExpansion(new IterReader(p)), r];
	});
	return create(terms);
};

export const birthdayConway = (conway: Conway0) =>
	countSigns(new IterReader(signExpansionFromConway(conway)), null);
