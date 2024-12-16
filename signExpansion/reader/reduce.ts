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

	// if (!entry0.sign && !entry0Parent.sign) {
	// 	// [-^l S] || [-^k R] = [-^(k + l) S]
	// 	// --> [-^(k + l) S] | [-^k R] = [-^l S]
	// 	const k = entry0Parent.sign === false ? entry0Parent.length : 0n;
	// 	yield { sign: false, length: k as O };
	// 	yield* iterSignExpansionReader(reducedChild);
	// 	return;
	// }

	// too many (or same) leading plpuses as number of pluses in parent
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
