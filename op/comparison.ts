import { Conway, type Conway0 } from "../conway";

export const {
	isZero,
	isOne,
	isNegOne,
	isPositive,
	isNegative,
	isAboveReals,
	isBelowNegativeReals,
	eq,
	compare,
} = Conway;

export const sign = (x: Conway0) => (isZero(x) ? 0 : isPositive(x) ? 1 : -1);

export const ne = (left: Conway0, right: Conway0) => !eq(left, right);

export const lt = (left: Conway0, right: Conway0) => compare(left, right) > 0;

export const gt = (left: Conway0, right: Conway0, _noHash = false) =>
	compare(left, right, _noHash) < 0;

export const le = (left: Conway0, right: Conway0) => compare(left, right) >= 0;

export const ge = (left: Conway0, right: Conway0) => compare(left, right) <= 0;
