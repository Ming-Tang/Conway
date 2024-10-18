import { Conway, type Conway0 } from "../conway";
import { realZero, type Real } from "../real";

export const {
	zero,
	one,
	negOne,
	unit,
	birthday,
	realBirthday,
	mono,
	mono1,
	ensure,
	maybeDowngrade,
	real: fromReal,
} = Conway;

export const termAt = (x: Conway, i: number): Conway => {
	const terms = x.getTerms();
	const [p, c] = terms[i] ?? [zero, realZero];
	return mono(c, p);
};

export const isMono = (x: Conway0) =>
	x instanceof Conway ? x.length <= 1 : true;

export const create = (
	x: [Conway0, Real][] | Iterable<[Conway0, Real]> | null | undefined,
) => new Conway(x);
