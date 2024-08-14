import { Conway } from "../conway";
import type { Real } from "../real";

export const {
	zero,
	one,
	unit,
	birthday,
	realBirthday,
	mono,
	mono1,
	ensure,
	maybeDowngrade,
	real: fromReal,
} = Conway;
export const isMono = (x: Real | Conway) =>
	x instanceof Conway ? x.length <= 1 : true;

export const create = (
	x:
		| [Conway | Real, Real][]
		| Iterable<[Conway | Real, Real]>
		| null
		| undefined,
) => new Conway(x);
