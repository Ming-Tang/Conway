import type { Ord0 } from "../../conway";
import { eq, le, lt } from "../../op";
import { ordinalAdd, ordinalRightSub } from "../../op/ordinal";
import type { Entry, SignExpansionReader } from "./types";

export const countSigns = <O extends Ord0 = Ord0>(
	reader: SignExpansionReader<O>,
	signIncluded: boolean | null = null,
): O => {
	let count: O = 0n as O;
	while (true) {
		const res = reader.lookahead();
		if (res === null) {
			break;
		}
		const { sign, length } = res;
		reader.consume(length);
		if (signIncluded !== null && sign !== signIncluded) {
			continue;
		}
		count = ordinalAdd(count, length) as O;
	}
	return count;
};

export const compareSign = (a: boolean | null, b: boolean | null) => {
	if (a === b) {
		return 0;
	}
	if (b === true) {
		return 1;
	}
	if (b === null) {
		return a ? -1 : 1;
	}
	// b === false
	return -1;
};

/**
 * Generates the common prefix between two sign expansions, and return
 * the comparison outcome in the end.
 * After the generator finishes, both readers will reach the position
 * of divergence.
 * @param reader1 The reader for the first sign expansion
 * @param reader2 The reader for the second sign expansion
 * @returns The lexicographical comparison between them
 */
export function* commonPrefix<O extends Ord0 = Ord0>(
	reader1: SignExpansionReader<O>,
	reader2: SignExpansionReader<O>,
) {
	while (true) {
		const res1 = reader1.lookahead();
		const res2 = reader2.lookahead();
		if (res1 === null && res2 === null) {
			return 0 as -1 | 0 | 1;
		}
		if (res1 === null || res2 === null) {
			return compareSign(res1?.sign ?? null, res2?.sign ?? null);
		}
		if (res1.sign !== res2.sign) {
			return compareSign(res1.sign, res2.sign);
		}
		const { length: len1 } = res1;
		const { length: len2 } = res2;
		if (eq(len1, len2)) {
			reader1.consume(len1);
			reader2.consume(len1);
			yield { sign: res1.sign, length: len1 } as Entry<O>;
			continue;
		}

		const length = lt(len1, len2) ? len1 : len2;
		reader1.consume(length);
		reader2.consume(length);
		yield {
			sign: res1.sign,
			length,
		} as Entry<O>;
		const sign = res1.sign;

		return lt(len1, len2)
			? compareSign(reader1.lookahead()?.sign ?? null, sign)
			: compareSign(sign, reader2.lookahead()?.sign ?? null);
	}
	throw new Error("unreachable");
}

export const compareSignExpansions = <O extends Ord0 = Ord0>(
	reader1: SignExpansionReader<O>,
	reader2: SignExpansionReader<O>,
): -1 | 0 | 1 => {
	const it = commonPrefix(reader1, reader2)[Symbol.iterator]();
	while (true) {
		const res = it.next();
		if (res.done) {
			return res.value;
		}
	}
	throw new Error("unreachable");
};

/**
 * Get the `i`th sign that match `signIncluded` of the sign expansion.
 * @param reader The sign expansion.
 * @param index The index to the sign
 * @param signIncluded `null` for any sigh, `true/false` for a particular sign.
 * @returns
 */
export const index = <O extends Ord0 = Ord0>(
	reader: SignExpansionReader<O>,
	index: O,
): boolean | null => {
	let count: O = 0n as O;
	while (true) {
		const res = reader.lookahead();
		if (res === null) {
			break;
		}
		const { sign, length } = res;
		reader.consume(length);
		const indexEnd = ordinalAdd(count, length) as O;
		if (le(count, index) && lt(index, indexEnd)) {
			return sign;
		}
		count = indexEnd;
	}
	return null;
};

/**
 * Get the `i`th sign that match `signIncluded` of the sign expansion.
 * @param reader The sign expansion.
 * @param index The index for the `i`th sigh.
 * @param signIncluded `null` for any sigh, `true/false` for a particular sign.
 * @returns
 */
export const findIndexToSign = <O extends Ord0 = Ord0>(
	reader: SignExpansionReader<O>,
	index: O,
	signIncluded: boolean,
): O | null => {
	let found = false;
	let partialIndex: O = 0n as O;
	let remain = index;
	while (true) {
		const res = reader.lookahead();
		if (res === null) {
			break;
		}
		const { sign, length } = res;
		reader.consume(length);
		if (sign !== signIncluded) {
			partialIndex = ordinalAdd(partialIndex, length) as O;
			continue;
		}

		if (lt(remain, length)) {
			found = true;
			partialIndex = ordinalAdd(partialIndex, remain) as O;
			break;
		}

		remain = ordinalRightSub(length, remain) as O;
		partialIndex = ordinalAdd(partialIndex, length) as O;
	}
	return found ? partialIndex : null;
};

/**
 * `index(truncate(S, n), i) = i < n ? index(S, i) : null`
 */
export function* truncate<O extends Ord0 = Ord0>(
	reader: SignExpansionReader<O>,
	truncateLength: O,
) {
	let count: O = 0n as O;
	while (true) {
		const res = reader.lookahead();
		if (res === null) {
			break;
		}
		const { sign, length } = res;
		const indexEnd = ordinalAdd(count, length) as O;
		if (le(count, truncateLength) && lt(truncateLength, indexEnd)) {
			const partialLen = ordinalRightSub(count, truncateLength) as O;
			reader.consume(partialLen);
			yield {
				sign,
				length: partialLen,
			} as Entry<O>;
			break;
		}

		count = indexEnd;
		reader.consume(length);
		yield { sign, length } as Entry<O>;
	}
}
