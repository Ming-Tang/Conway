import { Conway, type Real } from "../conway";

export const { zero, one, unit } = Conway;
export const mono = Conway.mono;
export const ensure = Conway.ensure;
export const maybeDowngrade = Conway.maybeDowngrade;

export const create = (
	x:
		| [Conway | Real, Real][]
		| Iterable<[Conway | Real, Real]>
		| null
		| undefined,
) => new Conway(x);
