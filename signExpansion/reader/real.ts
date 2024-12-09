import type { Ord0 } from "../../conway";
import { Dyadic, dyadicSignExpansionFrac, dyadicToMixed } from "../../dyadic";
import { tryGetFiniteOrd } from "../../op";
import { isZero, isAboveReals, lt } from "../../op/comparison";
import { ordinalDivRem, ordinalMult } from "../../op/ordinal";
import {
	realAdd,
	realIsNegative,
	realIsZero,
	realNeg,
	realSub,
	realToDyadic,
	type Real,
} from "../../real";
import type { Entry, SignExpansionReader } from "./types";

function* genRealPos(r: Dyadic, plus: boolean, omitInitial = false) {
	const [n, f] = dyadicToMixed(r);
	if (f.isZero) {
		if (n !== 0n) {
			yield { sign: plus, length: omitInitial ? n - 1n : n } as Entry<bigint>;
		}
		return;
	}

	yield { sign: plus, length: omitInitial ? n : n + 1n };

	let last = null as boolean | null;
	let count = 0n;
	for (const s of dyadicSignExpansionFrac(f)) {
		if (s === last) {
			count += 1n;
			continue;
		}
		if (last !== null && count > 0n) {
			yield { sign: last === plus, length: count };
		}
		last = s;
		count = 1n;
	}
	if (last !== null && count > 0n) {
		yield { sign: last === plus, length: count };
	}
}

export function* genReal(real: Real, omitInitial = false) {
	if (realIsZero(real)) {
		return;
	}
	if (realIsNegative(real)) {
		return yield* genRealPos(realToDyadic(realNeg(real)), false, omitInitial);
	}
	return yield* genRealPos(realToDyadic(real), true, omitInitial);
}

const readRealPos = (
	reader: SignExpansionReader<bigint>,
	plus: boolean,
): Real => {
	const pre = reader.lookahead();
	if (pre === null) {
		return 0n;
	}

	const { sign, length: prefixLength } = pre;
	let val: Real = prefixLength;
	if (sign !== plus) {
		val = realNeg(val);
	}
	reader.consume(prefixLength);
	let delta = Dyadic.ONE;
	while (true) {
		const res = reader.lookahead();
		if (res === null || (res && isAboveReals(res.length))) {
			break;
		}
		const { sign, length } = res;

		for (let i = 0n; lt(i, length); i++) {
			delta = delta.half();
			val = sign === plus ? realAdd(val, delta) : realSub(val, delta);
		}
		reader.consume(length);
	}

	return val;
};

export const readReal = (reader: SignExpansionReader<bigint>): Real => {
	const pre = reader.lookahead();
	if (pre === null) {
		return 0n;
	}

	if (!pre.sign) {
		return realNeg(readRealPos(reader, false));
	}
	return readRealPos(reader, true);
};

export function* genRealPart(
	real: Real,
	unitLength: Ord0,
	plus = true,
	omitInitial = true,
) {
	if (isZero(unitLength)) {
		return;
	}

	for (const { sign, length } of genReal(real, omitInitial)) {
		if (length === 0n) {
			continue;
		}
		yield {
			sign: sign === plus,
			length: ordinalMult(unitLength, length),
		};
	}
}

export function* readRealPartOmit(
	reader: SignExpansionReader,
	unitLength: Ord0,
	plus = true,
) {
	while (true) {
		const res = reader.lookahead();
		if (res === null) {
			break;
		}
		const { sign, length } = res;
		if (lt(length, unitLength)) {
			break;
		}

		const [q] = ordinalDivRem(length, unitLength);
		const o = tryGetFiniteOrd(q);
		if (isAboveReals(q) || o === null) {
			throw new RangeError("not supported: infinitely number of real signs");
		}
		if (q === 0n) {
			break;
		}

		if (o !== 0n) {
			yield { sign: sign === plus, length: o } as Entry<bigint>;
		}
		reader.consume(ordinalMult(unitLength, q));
	}
}
