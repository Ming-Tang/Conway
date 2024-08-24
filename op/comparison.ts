import { Conway } from "../conway";
import type { Real } from "../real";

export const {
	isZero,
	isOne,
	isPositive,
	isNegative,
	isAboveReals,
	isBelowNegativeReals,
	eq,
	compare,
} = Conway;

export const ne = (left: Real | Conway, right: Real | Conway) =>
	!eq(left, right);

export const lt = (left: Real | Conway, right: Real | Conway) =>
	compare(left, right) > 0;

export const gt = (
	left: Real | Conway,
	right: Real | Conway,
	_noHash = false,
) => compare(left, right, _noHash) < 0;

export const le = (left: Real | Conway, right: Real | Conway) =>
	compare(left, right) >= 0;

export const ge = (left: Real | Conway, right: Real | Conway) =>
	compare(left, right) <= 0;
