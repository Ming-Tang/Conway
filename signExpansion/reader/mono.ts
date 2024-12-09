import type { Ord0 } from "../../conway";
import { ensure, mono1 } from "../../op";
import { gt, isZero, le, lt } from "../../op/comparison";
import {
	ordinalAdd,
	ordinalDivRem,
	ordinalMult,
	ordinalRightSub,
	succ,
} from "../../op/ordinal";
import { realIsPositive, realIsZero, type Real } from "../../real";
import { genRealPart, readReal, readRealPartOmit } from "./real";
import { IterReader, type Entry, type SignExpansionReader } from "./types";

const tryConsume = (
	reader: SignExpansionReader,
	{ sign, length }: Entry,
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

export function* readMono1(reader: SignExpansionReader, plus = true) {
	// +^1
	if (!tryConsume(reader, { sign: plus, length: 1n })) {
		return 0n;
	}

	let nPlus = 0n as Ord0;
	while (true) {
		const result = reader.lookahead();
		if (!result) {
			break;
		}

		const { sign, length } = result;
		if (isZero(length)) {
			continue;
		}

		const len1 = ensure(length);
		const [p0] = len1.getTerms()[0] as [Ord0, unknown];
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
				// $addlPlus: addlPlus,
				// $nPlus: nPlus,
			} as Entry;
			reader.consume(mono1(p0));
			continue;
		}

		const b0 = succ(nPlus);
		if (lt(p0, b0)) {
			break;
		}

		const d = mono1(b0);
		const [q, rem] = ordinalDivRem(length, d);
		yield {
			sign: false,
			length: q,
			// $nPlus: nPlus,
			// $b0: b0,
			// $div: [length, '/', d, '=', q, 'R', rem]
		};
		reader.consume(ordinalMult(d, q));
	}

	return nPlus;
}

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
			nPlus = ordinalAdd(nPlus, length);
			yield { sign: plus, length: mono1(nPlus) };
			reader.consume(length);
			continue;
		}
		yield { sign: !plus, length: mono1(succ(nPlus)).ordinalMult(length) };
		reader.consume(length);
	}
	return nPlus;
}

export const readMono = (reader: SignExpansionReader) => {
	const head = reader.lookahead();
	if (head === null) {
		return null;
	}
	const plus = head.sign;
	const [mono1Part, nPlus] = genToArrayReturn(readMono1(reader, plus));
	const real = [
		{ sign: plus, length: 1n } as Entry<bigint>,
		...readRealPartOmit(reader, mono1(nPlus)),
	];
	return { mono1: mono1Part, real: readReal(new IterReader(real)), nPlus };
};

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
