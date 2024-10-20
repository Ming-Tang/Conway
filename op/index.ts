import { Conway, type Conway0 } from "../conway";
import { hasRealType, realZero, type Real } from "../real";

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

/**
 * If the argument represents a pure real number, return the real value.
 * Otherwise return the `Conway` itself.
 */
export const tryGetReal = (x: Conway0): Real | Conway => {
	if (x instanceof Conway) {
		const rv = x.realValue;
		return rv === null ? x : rv;
	}
	return x;
};

export const isReal = (x: Conway0): boolean => {
	return x instanceof Conway ? x.realValue !== null : true;
};

export const isConway0 = (x: unknown): x is Conway0 => {
	if (x instanceof Conway) {
		return true;
	}
	return hasRealType(x);
};
