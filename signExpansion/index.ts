import { Conway, type Conway0, type Ord, type Ord0 } from "../conway";
import { ensure, one } from "../op";
import type { Real } from "../real";
import { concat, cycleArray, empty, type Seq } from "../seq";
import { signExpansionFromConway } from "./reader/normalForm";
import { realMinus, realPlus, type Sign } from "./real";

export const signExpansion = (value: Real | Conway): Seq<Sign> => {
	const se = [...signExpansionFromConway(value)];
	return se.reduce(
		(s, { sign, length }) =>
			concat(s, cycleArray([sign], ensure(length) as Ord)),
		empty as Seq<Sign>,
	);
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
