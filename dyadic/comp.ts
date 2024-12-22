import type { Dyadic } from "./class";

export const eq = (a: Dyadic, b: Dyadic) =>
	a === b || (a.numerator === b.numerator && a.power === b.power);
export const ne = (a: Dyadic, b: Dyadic) =>
	a === b ? false : a.numerator << b.power !== b.numerator << a.power;
export const gt = (a: Dyadic, b: Dyadic) =>
	a.numerator << b.power > b.numerator << a.power;
export const ge = (a: Dyadic, b: Dyadic) =>
	a.numerator << b.power >= b.numerator << a.power;
export const lt = (a: Dyadic, b: Dyadic) =>
	a.numerator << b.power < b.numerator << a.power;
export const le = (a: Dyadic, b: Dyadic) =>
	a.numerator << b.power <= b.numerator << a.power;
export const compare = (a: Dyadic, b: Dyadic): -1 | 0 | 1 => {
	if (a === b) {
		return 0;
	}
	const v = (b.numerator << a.power) - (a.numerator << b.power);
	return v === 0n ? 0 : v > 0n ? 1 : -1;
};

export const isZero = (d: Dyadic) => d.isZero;
export const isPositive = (d: Dyadic) => d.isPositive;
export const isNegative = (d: Dyadic) => d.isNegative;
export const isOne = (d: Dyadic) => d.isOne;
export const isNegOne = (d: Dyadic) => d.isNegOne;
