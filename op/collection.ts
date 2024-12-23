import { one, zero } from ".";
import type { Conway, Conway0 } from "../conway";
import type { Real } from "../real";
import { add, mult } from "./arith";

export const sumTerms = <IsOrd extends boolean = boolean>(
	x: Conway<IsOrd>,
	f: (pow: Conway0<IsOrd>, coeff: Real, index: number) => Conway0,
): Conway0 => x.terms.map(([p, c], i) => f(p, c, i)).reduce(add, zero);

export const multTerms = <IsOrd extends boolean = boolean>(
	x: Conway<IsOrd>,
	f: (pow: Conway0<IsOrd>, coeff: Real) => Conway0,
): Conway0 => x.terms.map(([p, c]) => f(p, c)).reduce(mult, one);

export const getByIndex = <IsOrd extends boolean = boolean>(
	x: Conway<IsOrd>,
	index: number,
): Readonly<[Conway0<IsOrd>, Real]> => {
	if (index < 0 || index > x.terms.length) {
		throw new RangeError("getByIndex: out of bounds");
	}
	return x.terms[index];
};
