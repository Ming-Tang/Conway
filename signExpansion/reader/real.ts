import type { Ord0 } from "../../conway";
import type { Dyadic } from "../../dyadic";
import {
	dyadicAdd,
	dyadicFromBigint,
	dyadicNeg,
	dyadicSignExpansionFrac,
	dyadicToMixed,
} from "../../dyadic";
import { dyadicPow2 } from "../../dyadic/arith";
import { tryGetFiniteOrd } from "../../op";
import { isZero, isAboveReals, lt } from "../../op/comparison";
import { ordinalDivRem, ordinalMult } from "../../op/ordinal";
import {
	realIsNegative,
	realIsZero,
	realNeg,
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

export type LastSign = { value: Real; sign: boolean } | null;
export const readReal = (
	reader: SignExpansionReader<bigint>,
): [LastSign, Real] => {
	const pre = reader.lookahead();
	if (pre === null) {
		return [null, 0n];
	}

	reader.consume(pre.length);
	let value: Dyadic | bigint = pre.sign ? pre.length : -pre.length;
	// The exponent of b(i) in [Gonshor] Theorem 4.2: b(i) = 1/(2^(i-m+1))
	let exponent = -1n;
	let last: LastSign = {
		value: pre.sign ? value - 1n : value + 1n,
		sign: pre.sign,
	};

	while (true) {
		const head = reader.lookahead();
		if (head === null) {
			break;
		}
		if (typeof value === "bigint") {
			value = dyadicFromBigint(value);
		}

		const { sign, length: n } = head;
		for (let i = 0n; i < n; i++) {
			const delta = sign
				? dyadicPow2(exponent)
				: dyadicNeg(dyadicPow2(exponent));
			exponent--;
			last = { value, sign };
			value = dyadicAdd(value, delta);
		}
		reader.consume(n);
	}

	return [last, value];
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
		if (isAboveReals(q) || o === null || q === 0n) {
			break;
		}

		if (o !== 0n) {
			yield { sign: sign === plus, length: o } as Entry<bigint>;
		}
		reader.consume(ordinalMult(unitLength, q));
	}
}
