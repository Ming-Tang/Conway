import type { Ord0, Conway0 } from "../conway";
import { signExpansion } from "./gonshor";
import { zero } from "../op";
import { eq, gt, isZero, le, lt } from "../op/comparison";
import { ordinalAdd } from "../op/ordinal";
import { CanonSeq } from "./canonSeq";
import type {
	SignExpansionElement,
	NormalizeSignExpansionElement,
} from "./types";

export const normalizeSignExpansionSeq = function* (
	it: Iterable<SignExpansionElement>,
): Generator<NormalizeSignExpansionElement, { nMinus: Ord0; nPlus: Ord0 }> {
	let lastSign: boolean | null = null;
	let run: Ord0 = 0n;
	let min: Ord0 = 0n;
	let nMinus: Ord0 = 0n;
	let nPlus: Ord0 = 0n;
	let lastInitValue: Conway0 = zero;
	let lastFinalValue: Conway0 = zero;
	let lastSeq: CanonSeq = CanonSeq.zero();
	let captured: SignExpansionElement[] = [];
	const gen = it[Symbol.iterator]();
	while (true) {
		const res = gen.next();
		if (res.done) {
			break;
		}

		const { sign, length, initValue, finalValue, seq } = res.value;
		if (isZero(length)) {
			continue;
		}

		if (sign) {
			nPlus = ordinalAdd(nPlus, length);
		} else {
			nMinus = ordinalAdd(nMinus, length);
		}

		if (sign === lastSign) {
			run = ordinalAdd(run, length);
			lastFinalValue = finalValue;
			lastSeq = seq;
			captured.push(res.value);
			continue;
		}

		if (lastSign !== null) {
			yield {
				sign: lastSign,
				length: run,
				min,
				max: ordinalAdd(min, run),
				initValue: lastInitValue,
				finalValue: lastFinalValue,
				seq: lastSeq,
				captured,
			};
			lastSign = null;
			captured = [];
		}
		lastInitValue = initValue;
		lastFinalValue = finalValue;
		captured.push(res.value);
		lastSeq = seq;
		lastSign = sign;
		min = ordinalAdd(min, run);
		run = length;
	}
	if (lastSign !== null) {
		yield {
			sign: lastSign,
			length: run,
			min,
			max: ordinalAdd(min, run),
			initValue: lastInitValue,
			finalValue: lastFinalValue,
			seq: lastSeq,
			captured,
		};
	}
	return { nMinus, nPlus };
};
export const commonPrefix = function* (
	a: Iterable<NormalizeSignExpansionElement>,
	b: Iterable<NormalizeSignExpansionElement>,
): Generator<NormalizeSignExpansionElement> {
	const ga = a[Symbol.iterator]();
	const gb = b[Symbol.iterator]();
	while (true) {
		const res1 = ga.next();
		const res2 = gb.next();
		if (res1.done || res2.done || (res1.done && res2.done)) {
			break;
		}
		const e1 = res1.value;
		const e2 = res2.value;
		if (e1.sign !== e2.sign) {
			break;
		}
		const sign = e1.sign;
		if (eq(e1.length, e2.length)) {
			yield e1;
			continue;
		}
		const lower = lt(e1.length, e2.length);
		yield {
			sign,
			length: lower ? e1.length : e2.length,
			min: e1.min,
			max: lower ? e1.max : e2.max,
			initValue: e1.initValue,
			finalValue: lower ? e1.finalValue : e2.finalValue,
			seq: lower ? e1.seq : e2.seq,
			captured: lower ? e1.captured : e2.captured,
		};
		break;
	}
};
export const normalizeSignExpansionToArray = (
	gen: Iterable<SignExpansionElement>,
): {
	elems: NormalizeSignExpansionElement[];
	nMinus: Ord0;
	nPlus: Ord0;
} => {
	const elems: NormalizeSignExpansionElement[] = [];
	const genNormalize = normalizeSignExpansionSeq(gen);
	while (true) {
		const res = genNormalize.next();
		if (res.done) {
			const { nMinus, nPlus } = res.value;
			return { elems, nMinus, nPlus };
		}
		elems.push(res.value);
	}
	throw new Error("unreachable");
};
export const normalizedSignExpansionLength = (
	it: Iterable<NormalizeSignExpansionElement> | NormalizeSignExpansionElement[],
): Ord0 => {
	if (Array.isArray(it)) {
		return it.length === 0 ? 0n : it[it.length - 1].max;
	}
	let last: Ord0 = 0n;
	for (const { max } of it) {
		last = max;
	}

	return last;
};

interface SimplestBetweenReturn {
	element: SignExpansionElement;
	value: Conway0;
	isFinal: boolean;
	length: Ord0;
}
export const simplestBetween = (
	a: Conway0,
	b: Conway0,
): SimplestBetweenReturn => {
	if (gt(a, b)) {
		throw new RangeError("a > b");
	}

	const inRange = (x: Conway0) => le(a, x) && le(x, b);
	const inputs = [a, b];
	const results: (SimplestBetweenReturn | null)[] = [null, null];
	for (let i = 0; i < results.length; i++) {
		let res: null | SimplestBetweenReturn = null;
		let length: Ord0 = 0n;
		for (const element of signExpansion(inputs[i])) {
			const { initValue, finalValue, length: dLen } = element;
			if (inRange(initValue)) {
				res = { element, value: initValue, isFinal: false, length };
				break;
			}
			length = ordinalAdd(length, dLen);
			if (inRange(finalValue)) {
				res = { element, value: finalValue, isFinal: true, length };
				break;
			}
		}
		results[i] = res;
	}

	let best = -1;
	let minLen: Conway0 | null = null;
	for (let i = 0; i < results.length; i++) {
		const res = results[i];
		if (res === null) {
			continue;
		}

		if (minLen === null || lt(res.length, minLen)) {
			best = i;
			minLen = res.length;
		}
	}

	if (minLen === null) {
		throw new Error("unreachable");
	}
	return results[best] as SimplestBetweenReturn;
};
