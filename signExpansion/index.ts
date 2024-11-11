import { Conway, type Conway0 } from "../conway";
import { one } from "../op";
import type { Real } from "../real";
import type { Seq } from "../seq";
import { signExpansion as _signExpansion } from "./gonshor";
import { SignExpansionSeq } from "./types";
import { realMinus, realPlus, type Sign } from "./real";

export const signExpansion = (value: Real | Conway): Seq<Sign> => {
	return new SignExpansionSeq(_signExpansion(value));
};

export const conwayPlus = (x: Conway0) => {
	if (!(x instanceof Conway)) {
		return realPlus(x);
	}

	const terms = x.getTerms();
	const n = terms.length;
	if (terms.length === 0) {
		return one;
	}

	return new Conway([
		...terms.slice(0, n - 1),
		[terms[n - 1][0], realPlus(terms[n - 1][1])],
	]);
};

export const conwayMinus = (x: Conway0) => {
	if (!(x instanceof Conway)) {
		return realMinus(x);
	}

	const terms = x.getTerms();
	const n = terms.length;
	if (terms.length === 0) {
		return one;
	}

	return new Conway([
		...terms.slice(0, n - 1),
		[terms[n - 1][0], realMinus(terms[n - 1][1])],
	]);
};
