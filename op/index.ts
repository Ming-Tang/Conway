import { Conway, type Real } from "../conway";

export const { zero, one, unit } = Conway;
export const birthday = Conway.birthday;
export const mono = Conway.mono;
export const mono1 = (power: Real | Conway) => Conway.mono(1n, power);
export const ensure = Conway.ensure;
export const maybeDowngrade = Conway.maybeDowngrade;
export const isMono = (x: Real | Conway) =>
	x instanceof Conway ? x.length <= 1 : true;

export const create = (
	x:
		| [Conway | Real, Real][]
		| Iterable<[Conway | Real, Real]>
		| null
		| undefined,
) => new Conway(x);
