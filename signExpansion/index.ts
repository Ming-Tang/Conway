import { Conway, type Conway0, type Ord, type Ord0 } from "../conway";
import { create, ensure, one } from "../op";
import type { Real } from "../real";
import { type Seq, concat, cycleArray, empty } from "../seq";
import { signExpansionFromConway } from "./reader/normalForm";
import { type Sign, realMinus, realPlus } from "./real";

export { birthday } from "./birthday";

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

	const terms = x.terms;
	const n = terms.length;
	if (terms.length === 0) {
		return one;
	}

	return create([
		...terms.slice(0, n - 1),
		[terms[n - 1][0], realPlus(terms[n - 1][1])],
	]);
};

export const conwayMinus = (x: Conway0) => {
	if (!(x instanceof Conway)) {
		return realMinus(x);
	}

	const terms = x.terms;
	const n = terms.length;
	if (terms.length === 0) {
		return one;
	}

	return create([
		...terms.slice(0, n - 1),
		[terms[n - 1][0], realMinus(terms[n - 1][1])],
	]);
};
