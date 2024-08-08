import { Conway } from "../conway";

export const eq = Conway.eq;
export const ne = Conway.ne;
export const lt = Conway.lt;
export const le = Conway.le;
export const gt = Conway.gt;
export const ge = Conway.ge;

export const {
	isZero,
	isOne,
	isPositive,
	isNegative,
	isAboveReals,
	isBelowNegativeReals,
} = Conway;
