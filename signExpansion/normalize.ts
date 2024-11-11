import type { Ord0, Conway0 } from "../conway";
import { zero } from "../op";
import { eq, isZero, lt } from "../op/comparison";
import { ordinalAdd } from "../op/ordinal";
import type {
	SignExpansionElement,
	NormalizeSignExpansionElement,
} from "./types";

export const normalizeSignExpansionSeq = function* (
	it: Iterable<SignExpansionElement>,
): Generator<NormalizeSignExpansionElement, { nMinus: Ord0; nPlus: Ord0 }> {
	let last: boolean | null = null;
	let run: Ord0 = 0n;
	let min: Ord0 = 0n;
	let nMinus: Ord0 = 0n;
	let nPlus: Ord0 = 0n;
	let lastInitValue: Conway0 = zero;
	let lastFinalValue: Conway0 = zero;
	const gen = it[Symbol.iterator]();
	while (true) {
		const res = gen.next();

		if (res.done) {
			break;
		}

		const { sign, length, initValue, finalValue } = res.value;
		if (isZero(length)) {
			continue;
		}

		if (sign) {
			nPlus = ordinalAdd(nPlus, length);
		} else {
			nMinus = ordinalAdd(nMinus, length);
		}

		if (sign === last) {
			run = ordinalAdd(run, length);
			lastFinalValue = finalValue;
			continue;
		}

		if (last !== null) {
			yield {
				sign: last,
				length: run,
				min,
				max: ordinalAdd(min, run),
				initValue: lastInitValue,
				finalValue: lastFinalValue,
			};
			last = null;
		}
		lastInitValue = initValue;
		lastFinalValue = finalValue;
		last = sign;
		min = ordinalAdd(min, run);
		run = length;
	}
	if (last !== null) {
		yield {
			sign: last,
			length: run,
			min,
			max: ordinalAdd(min, run),
			initValue: lastInitValue,
			finalValue: lastFinalValue,
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
		yield {
			sign,
			length: lt(e1.length, e2.length) ? e1.length : e2.length,
			min: e1.min,
			max: lt(e1.max, e2.max) ? e1.max : e2.max,
			// TODO fix this
			initValue: zero,
			finalValue: zero,
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
