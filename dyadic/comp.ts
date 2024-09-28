import type { Dyadic } from "./class";

export const eq = (a: Dyadic, b: Dyadic) =>
	a === b || a.numerator << b.power === b.numerator << a.power;
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
