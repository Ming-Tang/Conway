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

/**
 * Given a real number that is a dyadic, generates its
 * sign expansion.
 * @param omitInitial `true` to omit the initial plus or minus.
 * `false` (default) otherwise.
 * @see `readReal` for the inverse
 */
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

/**
 * Given the sign expansion of a real number, generates its sign expansion.
 * @param reader The reader to read the real from
 * @see `genReal` for the inverse
 * @returns The tuple `[lastSign, real]` where:
 * - `real` is the real number from the sign expansion.
 * - `lastSign` The last sign (`+^1` or `-^1`) and the real value before
 * the last sign was added. `lastSign === null` if and only if the `real` is zero.
 */
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

/**
 * Given a sign expansion reader for the real part and the number of
 * pluses of the mono1.
 * Generates the sign expansion contribution of the real part.
 * @param real The real number of generate
 * @param unitLength The number of pluses in the sign expansion of the exponent
 * @param plus `true` if the monomial is positive, `false` for negative
 * @see `readRealPart` for the inverse
 */
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

/**
 * Given a sign expansion reader that has already read a mono1
 * with a known number of pluses. Generates the sign expansion
 * of the real part without the initial plus or minus.
 * @param reader The sign expansion reader in the state right after reading a mono1
 * @param unitLength The number of pluses in the sign expansion of the exponent, obtained after reading the mono1
 * @see `genRealPart` for the inverse
 */
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
