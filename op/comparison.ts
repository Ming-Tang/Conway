import { Conway } from "../conway";
import type { Real } from "../real";

export const ne = (left: Real | Conway, right: Real | Conway) =>
	!Conway.eq(left, right);

export const lt = (left: Real | Conway, right: Real | Conway) =>
	Conway.compare(left, right) > 0;

export const gt = (
	left: Real | Conway,
	right: Real | Conway,
	_noHash = false,
) => Conway.compare(left, right, _noHash) < 0;

export const le = (left: Real | Conway, right: Real | Conway) =>
	Conway.compare(left, right) >= 0;

export const ge = (left: Real | Conway, right: Real | Conway) =>
	Conway.compare(left, right) <= 0;

export const {
	isZero,
	isOne,
	isPositive,
	isNegative,
	isAboveReals,
	isBelowNegativeReals,
	eq,
} = Conway;
