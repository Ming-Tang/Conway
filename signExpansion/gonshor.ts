import {
	Conway,
	INSTANCE_IMPLS,
	type Conway0,
	type Ord,
	type Ord0,
} from "../conway";
import { Dyadic } from "../dyadic";
import { ensure, isReal, mono, mono1, zero } from "../op";
import { add, neg } from "../op/arith";
import {
	ge,
	gt,
	isAboveReals,
	isNegative,
	isOne,
	isZero,
	lt,
} from "../op/comparison";
import { ordinalAdd, succ } from "../op/ordinal";
import { realIsNegative, realNeg, realSub, realZero, type Real } from "../real";
import { CanonSeq } from "./canonSeq";
import {
	realMinus,
	realPlus,
	signExpansionReal as signExpansionRealArray,
} from "./real";
import type { SignExpansionElement } from "./types";

export const signExpansionRealNonReduced = function* (
	r: Real,
): Generator<SignExpansionElement<Real>, bigint> {
	const arr = signExpansionRealArray(r);
	let value = realZero;
	let nPlus = 0n;
	for (
		let index: Ord = zero;
		lt(index, arr.length);
		index = ensure(succ(index)) as Ord
	) {
		const sign = arr.index(index);
		if (sign) {
			nPlus++;
		}
		const ri = value;
		const finalValue = sign ? realPlus(ri) : realMinus(ri);
		yield {
			sign,
			length: 1n,
			initValue: ri,
			finalValue,
			seq: CanonSeq.step(ri, finalValue),
		};
		value = finalValue;
	}
	return nPlus;
};

export const signExpansionReal = function* (
	r: Real,
	reduce = false,
): Generator<SignExpansionElement<Real>, bigint> {
	if (isZero(r)) {
		return 0n;
	}

	if (!reduce) {
		return yield* signExpansionRealNonReduced(r);
	}

	const it = signExpansionRealNonReduced(r);
	const r0 = it.next();
	if (r0.done) {
		return r0.value;
	}
	while (true) {
		const res = it.next();
		if (res.done) {
			return res.value;
		}
		yield res.value;
	}
};

/**
 * Get the ordinal number of leading pluses in the sign expansion of `p`.
 */
export const leadingPluses = (p: Conway0): Ord0 => {
	let tot = 0n as Ord0;
	for (const { sign, length } of signExpansion(p)) {
		if (sign) {
			tot = ordinalAdd(tot, length);
		}
	}
	return tot;
};

/**
 * Generate the modified sign expansion of the
 * exponent `p` given previous exponents `prevTerms`.
 *
 * If `prevTerms` contains a negative value, then the first
 * entry has `initValue` of zero and sign of a single minus.
 */
export const signExpansionOmit = function* (
	p: Conway0,
	prevTerms: Conway0[],
): Generator<SignExpansionElement, void, undefined> {
	const it = signExpansion(p);
	const findTooHighExclusive = (p0: Conway0) =>
		prevTerms.findLastIndex((pi) => ge(p0, pi));
	const findTooHighInclusive = (p0: Conway0) =>
		prevTerms.findLastIndex((pi) => gt(p0, pi));
	const iVerify = findTooHighInclusive(p);
	if (iVerify !== -1) {
		throw new RangeError(
			"signExpansionOmit: p is greater than one of prevTerms",
		);
	}
	while (true) {
		const res = it.next();
		if (res.done) {
			break;
		}
		const entry = res.value;
		const { initValue: initValue0, finalValue: finalValue0, seq: seq0 } = entry;
		const iInitTooHigh = findTooHighInclusive(initValue0);
		const initTooHigh = iInitTooHigh !== -1;
		const iFinalTooHigh = findTooHighExclusive(finalValue0);
		const finalTooHigh = iFinalTooHigh !== -1;
		if (initTooHigh && finalTooHigh) {
			continue;
		}

		if (!initTooHigh && !finalTooHigh) {
			yield entry;
			continue;
		}

		const omittedBy =
			iFinalTooHigh !== -1 ? prevTerms[iFinalTooHigh] : prevTerms[iInitTooHigh];

		let containsPlus = entry.sign;
		let initValue1 = initTooHigh ? finalValue0 : initValue0;
		let finalValue1 = finalValue0;
		let seq1 = seq0;
		let nPlus: Ord0 = entry.sign ? entry.length : 0n;
		const omitted: SignExpansionElement[] = [entry];
		while (findTooHighExclusive(finalValue1) !== -1) {
			const res1 = it.next();
			if (res1.done) {
				break;
			}

			omitted.push(res1.value);
			const {
				sign: sign1,
				initValue: initValue2,
				finalValue: finalValue2,
				seq: seq2,
				length: n,
			} = res1.value;
			if (sign1) {
				containsPlus = true;
				nPlus = ordinalAdd(nPlus, n);
			}
			finalValue1 = finalValue2;
			seq1 = seq2;
			if (findTooHighInclusive(initValue1) !== -1) {
				initValue1 = initValue2;
			}
		}

		yield {
			...entry,
			sign: containsPlus,
			initValue:
				findTooHighInclusive(initValue1) !== -1 ? finalValue1 : initValue1,
			finalValue: finalValue1,
			seq: seq1,
			length: nPlus,
			omitted,
			omittedBy,
		};
	}
};

const DEBUG = false;

/**
 * Get the sign expansion of `w^p` in the middle of a Conway normal form
 * given the list of previous terms and "plus value" of the previous coefficient.
 * See: [Gonshor] Theorem 5.11 and Corollary 5.1
 * @param p The exponent
 * @param prevTerms The previous exponents in the Conway normal form
 * @param plusValue The valuation corresponding to a single plus at this point.
 * @returns `p^+`, the number of pluses in the sign expansion of `p` (NOT the sign expansion of `mono1(p)`)
 */
export const signExpansionMono1 = function* (
	p: Conway0,
	prevTerms?: Conway0[],
	plusValue = 1n as Conway0,
): Generator<SignExpansionElement, Ord0, undefined> {
	const $mono1 = DEBUG ? { p, prevTerms, plusValue } : {};
	const debug0 = DEBUG ? { $mono1: { ...$mono1, index: 0n } } : {};
	if (isZero(p)) {
		yield {
			sign: true,
			length: 1n,
			initValue: 0n,
			finalValue: plusValue,
			seq: CanonSeq.step(0n, plusValue),
			...debug0,
		};
		return 0n;
	}

	let nPlus: Ord0 = 0n;
	let index = 1n;
	const se = prevTerms ? signExpansionOmit(p, prevTerms) : signExpansion(p);

	// [Gonshor] Corollary 5.1
	for (const entry of se) {
		const {
			sign,
			length: n,
			initValue: pi,
			finalValue: pNext,
			seq: pSeq,
		} = entry;
		if (index === 1n) {
			const rest = {
				sign: true,
				length: 1n,
				initValue: 0n,
				...debug0,
			};

			if (isZero(n)) {
				yield {
					finalValue: mono1(pNext),
					seq: CanonSeq.step(0n, mono1(pNext)),
					...rest,
				};
				index++;
				continue;
			}

			yield {
				finalValue: plusValue,
				seq: CanonSeq.step(0n, plusValue),
				...rest,
			};
		}

		const initValue = index === 1n ? plusValue : mono1(pi);
		const finalValue = mono1(pNext);
		let seq: CanonSeq;
		if (index === 1n) {
			seq = CanonSeq.iterSign(plusValue, !sign);
		} else if (pSeq.isInfinite) {
			seq = pSeq.mono1();
		} else {
			seq = CanonSeq.monosPos(pi, !sign);
		}

		const debug = DEBUG ? { $mono1: { ...$mono1, index, $entry: entry } } : {};
		const rest = { initValue, finalValue, seq, ...debug };
		if (sign) {
			nPlus = ordinalAdd(nPlus, n);
			yield {
				sign: true,
				length: mono1(nPlus),
				...rest,
			};
		} else {
			yield {
				sign: false,
				length: mono1(succ(nPlus)).ordinalMult(n),
				...rest,
			};
		}
		index++;
	}
	return nPlus;
};

const rightmostLeft = (x: Conway0): SignExpansionElement | null => {
	let last: SignExpansionElement | null = null;
	for (const e of signExpansion(x)) {
		if (e.sign) {
			last = e;
		}
	}
	return last;
};

export const signExpansion = function* (
	x: Conway0,
): Generator<SignExpansionElement, void, undefined> {
	if (!(x instanceof Conway)) {
		yield* signExpansionReal(x);
		return;
	}

	const rv = x.realValue;
	if (rv !== null) {
		yield* signExpansionReal(rv);
		return;
	}

	const terms = x.getTerms();
	let sum: Conway0 = zero;
	const omits: Conway0[] = [];
	let lastReal: Real = 0n;
	for (let i = 0; i < terms.length; i++) {
		const [p, c] = terms[i];
		const base = sum;
		sum = add(sum, mono(c, p));

		const flip = realIsNegative(c);
		let plusValue = 1n as Conway0;
		if (isNegative(p) && i > 0) {
			const dr = flip
				? realNeg(realSub(realMinus(lastReal), lastReal))
				: realSub(realPlus(lastReal), lastReal);
			plusValue = mono(dr, terms[i - 1][0]);
		}
		const it =
			i > 0
				? signExpansionMono1(p, [...omits], plusValue)
				: signExpansionMono1(p);
		lastReal = c;

		omits.push(p);
		let nPlus: Ord0 = 0n;

		// power part: w^p_i
		let idx = 0;
		while (true) {
			const res = it.next();
			if (res.done) {
				nPlus = res.value;
				break;
			}
			const {
				sign,
				length,
				initValue: mi,
				finalValue: mNext,
				seq: mSeq,
				...omit
			} = res.value;
			const outSign = flip ? !sign : sign;
			const initValue = add(base, flip ? neg(mi) : mi);
			const finalValue = add(base, flip ? neg(mNext) : mNext);
			const seq = (flip ? mSeq.neg() : mSeq).add(base);
			yield {
				sign: outSign,
				length,
				initValue,
				finalValue,
				seq,
				...(DEBUG
					? {
							$term: {
								index: i,
								base,
								part: ["mono1", idx],
							},
						}
					: {}),
				...omit,
			};
			idx++;
		}

		idx = 0;
		const last = rightmostLeft(p);
		let pLeft: CanonSeq | Conway0 = 0n;
		if (last === null) {
			pLeft = 0n;
		} else if (isReal(last.length)) {
			pLeft = last.initValue;
		} else {
			pLeft = last.seq;
		}

		// real part: r w^p
		for (const {
			sign,
			length: len0,
			initValue: ri,
			finalValue: rNext,
		} of signExpansionReal(c, true)) {
			const base1 = add(base, mono(ri, p));
			const finalValue = add(base, mono(rNext, p));
			const length = mono1(nPlus).ordinalMult(len0) as Ord0;
			yield {
				sign,
				length,
				initValue: base1,
				finalValue,
				seq: isOne(length)
					? CanonSeq.step(base1, finalValue)
					: (pLeft instanceof CanonSeq
							? (!sign ? pLeft.mono1().neg() : pLeft.mono1()).shift()
							: CanonSeq.monos(pLeft, !sign)
						).add(base1),
				...(DEBUG
					? {
							$term: {
								nPlus,
								index: i,
								base,
								part: ["real", idx],
							},
						}
					: {}),
			};
			idx++;
		}
	}
};

INSTANCE_IMPLS.birthday = (x: Conway) => {
	let sum: Ord0 = 0n;
	for (const { length } of signExpansion(x)) {
		sum = ordinalAdd(sum, length);
	}
	return sum;
};
