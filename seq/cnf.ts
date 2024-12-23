import { Conway, type Ord, type Ord0 } from "../conway";
import { zero } from "../op";
import { ge, isOne, isZero, lt, ne } from "../op";
import {
	ordinalEnsure as ensure,
	ordinalAdd,
	ordinalRightSub,
} from "../op/ordinal";
import type { Cnf, CnfConcat, Seq } from "./types";

export const defaultCnf = <T>(f: Seq<T>, terms: number) => {
	const elems: T[] = [];
	for (let i = 0; i < terms; i++) {
		const idx = ensure(i);
		if (ge(idx, f.length)) {
			break;
		}

		elems.push(f.index(idx));
	}

	return {
		concat: [elems] as [T[]],
		length: f.length,
	} satisfies CnfConcat<T>;
};

const cnfToJson = <T>(cnf: Cnf<T>): string | null => {
	let json = "";
	try {
		json = JSON.stringify(cnf, (_, v) => {
			if (v instanceof Conway) {
				return v.toString();
			}
			if (typeof v === "bigint") {
				return `${v}n`;
			}
			return v;
		});
	} catch (e) {
		console.error(e);
		return null;
	}
	return json;
};

export const simplifyCycle = <T>(cnf: {
	cycle: Cnf<T>;
	times: Ord;
	length: Ord;
}): Cnf<T> => {
	if (isZero(cnf.length) || isZero(cnf.times)) {
		return [];
	}

	if (isOne(cnf.times)) {
		return cnf.cycle;
	}

	return cnf;
};

export const simplifyConcat = <T>(cnf: {
	concat: Cnf<T>[];
	length: Ord;
}): Cnf<T> => {
	if (isZero(cnf.length)) {
		return [];
	}

	const xs = cnf.concat;
	const concat: Cnf<T>[] = [];
	let i = 0;
	while (i < xs.length) {
		const el = xs[i];
		if (isZero(el.length)) {
			i++;
			continue;
		}

		const j0 = cnfToJson(el) ?? `?${i}`;
		let j = i + 1;
		let totalLen: Ord0 = el.length;
		while (j < xs.length) {
			if (ne(xs[j].length, el.length)) {
				// console.log('diff len', xs[j].length, el.length);
				break;
			}
			const j1 = cnfToJson(xs[j]) ?? `?${j}`;
			if (j1 !== j0) {
				// console.log('diffJ', j0, j1);
				break;
			}
			totalLen = ordinalAdd(totalLen, j1.length);
			j++;
		}

		if (j - i > 1) {
			const times = ensure(j - i);
			concat.push({
				cycle: el,
				times,
				length: ensure(totalLen),
			});
		} else {
			concat.push(el);
		}
		i = j;
	}

	if (concat.length === 0) {
		return [];
	}

	return { concat, length: cnf.length };
};

export const cnfOrDefault = <T>(f: Seq<T>, terms: number) => {
	if (f.cnf) {
		return f.cnf(terms);
	}
	return defaultCnf(f, terms);
};

export const summarizeCnf = <T>(
	cnf: Cnf<T>,
	arrayToString: (array: T[]) => string,
): string => {
	if (Array.isArray(cnf)) {
		return arrayToString(cnf);
	}
	if ("concat" in cnf) {
		const parts: string[] = [];
		let totalLen = 0n as Ord0;
		for (const child of cnf.concat) {
			parts.push(summarizeCnf(child, arrayToString));
			totalLen = ordinalAdd(totalLen, child.length);
		}
		const dLen = lt(cnf.length, totalLen)
			? zero
			: ordinalRightSub(totalLen, cnf.length);
		const el = isZero(dLen) ? "" : ` ...[${dLen}]`;
		return `(${parts.join(" & ")}${el})`;
	}
	if ("cycle" in cnf) {
		if (isOne(cnf.times)) {
			return `(${summarizeCnf(cnf.cycle, arrayToString)})`;
		}
		return `(${summarizeCnf(cnf.cycle, arrayToString)})^[${cnf.times}]`;
	}
	throw new Error("summarizeCnf: invalid");
};

export const ordToLaTeX = (x: Conway) => x.toLaTeX();

export const summarizeCnfLaTeX = <T>(
	cnf: Cnf<T>,
	arrayToString: (array: T[]) => string,
): string => {
	if (Array.isArray(cnf)) {
		return arrayToString(cnf);
	}
	if ("concat" in cnf) {
		const parts: string[] = [];
		let totalLen = 0n as Ord0;
		for (const child of cnf.concat) {
			parts.push(summarizeCnfLaTeX(child, arrayToString));
			totalLen = ordinalAdd(totalLen, child.length);
		}
		const dLen = lt(cnf.length, totalLen)
			? zero
			: ensure(ordinalRightSub(totalLen, cnf.length));
		const el = isZero(dLen) ? "" : ` \\ldots^{${ordToLaTeX(dLen)}}`;
		if (parts.length === 1 && !el) {
			return parts[0];
		}
		if (el) {
			return `\\underbrace{${parts.join(" ")}${el}}_{${ordToLaTeX(cnf.length)}}`;
		}
		return `${parts.join(" ")}${el}`;
	}
	if ("cycle" in cnf) {
		if (isOne(cnf.times)) {
			return `${summarizeCnfLaTeX(cnf.cycle, arrayToString)}`;
		}
		return `\\left(${summarizeCnfLaTeX(cnf.cycle, arrayToString)}\\right)^{${ordToLaTeX(cnf.times)}}`;
	}
	throw new Error("summarizeCnfLaTeX: invalid");
};

export const signExpansionToString = (xs: boolean[]) =>
	xs.map((f) => (f ? "+" : "-")).join("");
