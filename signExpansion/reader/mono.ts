import { makeReader } from ".";
import type { Ord0 } from "../../conway";
import { ensure, mono1 } from "../../op";
import { gt, isZero, le, lt } from "../../op";
import {
	ordinalAdd,
	ordinalDivRem,
	ordinalMult,
	ordinalRightSub,
	succ,
} from "../../op/ordinal";
import { type Real, realIsPositive, realIsZero } from "../../real";
import { genRealPart, readReal, readRealPartOmit } from "./real";
import type { Entry, SignExpansionReader } from "./types";

const tryConsume = (
	reader: SignExpansionReader,
	{ sign, length }: Entry,
	strict = true,
): boolean => {
	const res = reader.lookahead();
	if (!res || res.sign !== sign || gt(length, res.length)) {
		return false;
	}
	reader.consume(length);
	return true;
};

const genToArrayReturn = <T, R>(gen: Generator<T, R>) => {
	const arr: T[] = [];
	while (true) {
		const res = gen.next();
		if (res.done) {
			return [arr, res.value] as [T[], R];
		}
		arr.push(res.value);
	}
	throw new Error("unreachable code");
};

export interface SkipFirst {
	sign: boolean;
	exponent: Ord0;
}

/**
 * Reads the next sign expansion of a positive or negative mono1 (`w^p` or `-w^p`)
 * and generates the sign expansion for `p`.
 * See [Gonshor] Theorem 5.11(a) and Corollary 5.1 for more details.
 * @param plus True for parsing a positive mono1, false for negative.
 * @param skipFirst If not null, skip consuming the first segment of the sign expansion.
 * @returns The ordinal number of pluses in the parsed `p`.
 * @see `genMono1` for its inverse
 */
export function* readMono1(
	reader: SignExpansionReader,
	plus = true,
	skipFirst = null as SkipFirst | null,
) {
	let skip = skipFirst;
	if (skip === null) {
		// +^1
		if (!tryConsume(reader, { sign: plus, length: 1n }, false)) {
			return 0n;
		}
	} else {
		if (skip.sign !== plus) {
			throw new Error("Need to skip a +^1 but got a -");
		}

		if (isZero(skip.exponent)) {
			// Consume skip w^0 = 1
			skip = null;
		}
	}

	let nPlus = 0n as Ord0;
	while (true) {
		let result: Entry | null = null;
		let consumedSkipped = false;
		if (skip !== null) {
			result = { sign: skip.sign, length: mono1<Ord0>(skip.exponent) };
			consumedSkipped = true;
			skip = null;
		} else {
			result = reader.lookahead();
		}

		if (!result) {
			break;
		}

		const { sign, length } = result;
		if (isZero(length)) {
			continue;
		}

		const len1 = ensure(length);
		const [p0] = len1.terms[0] as [Ord0, unknown];
		if (sign === plus) {
			// length = w^(nPlus + ...) + ...
			// or else the plus does not belong to mono1
			if (le(p0, nPlus)) {
				break;
			}
			const addlPlus = ordinalRightSub(nPlus, p0);
			nPlus = ordinalAdd(nPlus, addlPlus);
			yield {
				sign: true,
				length: addlPlus,
			} as Entry;

			if (!consumedSkipped) {
				reader.consume(mono1(p0));
			}
			continue;
		}

		// minus case
		const b0 = succ(nPlus);
		if (lt(p0, b0)) {
			break;
		}

		const d = mono1(b0);
		const [q] = ordinalDivRem(length, d);
		yield {
			sign: false,
			length: q,
		};

		if (!consumedSkipped) {
			reader.consume(ordinalMult(d, q));
		}
	}

	return nPlus;
}

/**
 * Given the sign expansion of an exponent `p`, generate the sign expansion of
 * the mono1, either `w^p` or `-w^p`.
 * See [Gonshor] Theorem 5.11(a)
 * @param plus True for generating the sign expansion of a positive mono1, false for negative.
 * @returns The ordinal number of pluses in the parsed exponent.
 * @see `readMono1` for its inverse
 */
export function* genMono1(reader: SignExpansionReader, plus = true) {
	yield { sign: plus, length: 1n } as Entry;
	let nPlus = 0n as Ord0;
	while (true) {
		const result = reader.lookahead();
		if (!result) {
			break;
		}

		const { sign, length } = result;
		if (sign) {
			// plus
			nPlus = ordinalAdd(nPlus, length);
			yield { sign: plus, length: mono1(nPlus) };
			reader.consume(length);
			continue;
		}

		// minus
		yield { sign: !plus, length: ordinalMult(mono1(succ(nPlus)), length) };
		reader.consume(length);
	}
	return nPlus;
}

/**
 * Reads a monomial (`w^p.r`) from the `reader`.
 * The next sign from the reader determines the sign of the real part. If the first
 * sign was already consumed by the previous term, pass the already-consumed sign to
 * the `skippedFirstPlus` parameter.
 *
 * See [Gonshor] Theorem 5.11 and Theorem 5.12 for more details on the
 * sign expansion of a monomial.
 * @param reader
 * @param skippedFirstPlus
 * @returns `null` if there's nothing to parse. Otherwise:
 *  - The exponent (`.mono1`),
 *  - the real part (`.real`),
 *  - the number of pluses in the parsed exponent (`nPlus`),
 *  - and the `.lastSign` to handle skipping the first plus for reading the next monomial.
 * @see `genMono` for its inverse
 */

export const readMono = (
	reader: SignExpansionReader,
	skipFirst = null as SkipFirst | null,
) => {
	const head = reader.lookahead();
	if (head === null) {
		return null;
	}
	const plus = skipFirst?.sign ?? head.sign;
	const [mono1Part, nPlus] = genToArrayReturn(
		readMono1(reader, plus, skipFirst),
	);
	const real = [
		{ sign: plus, length: 1n } as Entry<bigint>,
		...readRealPartOmit(reader, mono1(nPlus)),
	];
	const [lastSign, realValue] = readReal(makeReader(real));
	return { mono1: mono1Part, real: realValue, nPlus, lastSign };
};

/**
 * Given an exponent and a real number, generates the sign expansion of
 * the monomial `w^p.r`.
 * @param mono1 The exponent
 * @param real The real part
 * @returns Ordinal number of pluses in the exponent
 * @see `readMono` for its inverse
 */
export function* genMono({
	mono1: mono1Part,
	real,
}: { mono1: SignExpansionReader; real: Real }) {
	if (realIsZero(real)) {
		return 0n;
	}
	const nPlus = yield* genMono1(mono1Part, realIsPositive(real));
	yield* genRealPart(real, mono1(nPlus), true, true);
	return nPlus;
}
