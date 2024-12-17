import { isAboveReals, isZero } from "../../op/comparison";
import type { Real } from "../../real";
import { genMono, readMono } from "./mono";
import { reduceMulti, unreduceMulti } from "./reduce";
import { IterReader, type Entry, type SignExpansionReader } from "./types";

export type Term = [Entry[], Real];

export const decomposeSignExpansion = (
	reader: SignExpansionReader,
	unreduce = true,
) => {
	const terms: Term[] = [];
	let skippedFirstPlus = null as null | true | false;
	while (reader.lookahead() !== null) {
		const res =
			skippedFirstPlus !== null
				? readMono(reader, skippedFirstPlus)
				: readMono(reader);
		if (res === null) {
			break;
		}

		skippedFirstPlus = null;
		const { mono1, real, lastSign, nPlus } = res;

		const next = reader.lookahead();
		if (next !== null && lastSign !== null) {
			const { sign: nextSign, length: nextLen } = next;
			const isInNonInfPart = isZero(nPlus);
			// Are we in a segment of [+^1 -^(infinite)] or [-^1 +^(infinite)]?
			// The `+^1` or `-^1` must be part of a real part (nPlus=0) and it
			// has already been parsed by the previous term.
			if (isInNonInfPart && isAboveReals(nextLen)) {
				if (lastSign.sign === nextSign) {
					console.error("invalid parser state", {
						skippedFirstPlus,
						res,
						lastSign,
						nextSign,
					});
					throw new Error(
						"invalid parser state: [+^finite +^infinite] or [-^finite -^infinite]",
					);
				}

				terms.push([mono1, lastSign.value]);
				skippedFirstPlus = lastSign.sign;
				continue;
			}
		}

		terms.push([mono1, real]);
	}

	if (!unreduce) {
		return terms;
	}

	const terms1: Term[] = [];
	const prev: Entry[][] = [];
	for (let i = 0; i < terms.length; i++) {
		const [m1, real] = terms[i];
		const unreduced = i === 0 ? m1 : unreduceMulti([...prev, m1])[i];
		terms1.push([
			unreduced,
			real,
			{ m1, multi: [...prev, m1], un: unreduceMulti([...prev, m1]) },
		] as never);
		prev.push(m1);
	}
	return terms1;
};

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
