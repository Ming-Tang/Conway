import { create, ensure, mono, mono1, one, zero } from ".";
import type { Conway, Conway0 } from "../conway";
import { type Real, realMult } from "../real";
import { add, mult, sub } from "./arith";
import { multTerms, sumTerms } from "./collection";
import { eq, isZero } from "./comparison";

/**
 * `g : No[>0] -> No`
 * `g(x) = { index(x), g(L(x)) | h(R(x)) }`
 * `x ~ w^index(x)`
 */
const g = (x: Conway0): Conway0 => {
	return x;
};

/**
 * `h : No -> No[>0]`
 * `h(x) = { 0, h(L(x)) | h(R(x)), w^x/2^k }`
 * `h` is the inverse of `g`.
 */
const h = (x: Conway0): Conway0 => {
	return x;
};

/**
 * exp(w^x)
 */
const expLow = (x: Conway0, terms = null as number | null): Conway0 => {
	if (isZero(x)) {
		return 1n;
	}
	if (terms === null) {
		throw new RangeError("terms is null");
	}

	let sum: Conway0 = 0n;
	let f = 1.0;
	let xPow: Conway0 = one;
	for (let i = 0; i < terms; i++) {
		sum = add(sum, mult(xPow, 1.0 / f));
		xPow = mult(xPow, x);
		f *= i + 1;
	}
	return sum;
};

/**
 * Evaluate the infinite series for `log(1 + x)` where `x` is infinitesimal.
 */
export const log1pLow = (x: Conway0, terms = null as number | null) => {
	if (isZero(x)) {
		return one;
	}
	if (terms === null) {
		throw new RangeError("terms is null");
	}

	let sum: Conway0 = 0n;
	let f = 1.0;
	let xPow = x;
	for (let i = 1; i <= terms; i++) {
		sum = add(sum, mult(xPow, f / i));
		xPow = mult(xPow, x);
		f *= -1.0;
	}
	return sum;
};

/**
 * Evaluate the log of a purely infinite value `x = w^(c_0 w^p_0 + ...)`.
 * ``log(w^(c_0 w^p_0 + ...)) = c_0 h(p_0) + ...``
 *
 * h(x) = x due to x being smaller than epsilon numbers.
 */
const logInf = (x: Conway0) =>
	sumTerms(ensure(x), (p, c) => mult(mono1(h(p)), c));

/**
 * Given a surreal number, factor it into `(r w^inf) * (1 + low)`.
 *
 * @param x The number to be factored, must be positive
 * @returns `{ inf, r, low }` where `inf` is the exponent of the leading term,
 * `r` is the real coefficient of the leading term and `low` is a pure infinitesimal.
 */
export const factorLeadLow = (x: Conway) => {
	const { leadingPower: pLead0, leadingCoeff: r } = x;
	const pLead = pLead0 ?? zero;
	const inf = pLead;
	const terms: [Conway0, Real][] = [];
	for (const [p, c] of x) {
		if (eq(p, pLead)) {
			continue;
		}
		terms.push([sub(p, pLead), realMult(c, 1.0 / Number(r))]);
	}

	return { inf, r, low: create(terms) };
};

export const exp = (x: Conway0, terms: number | null = null): Conway0 => {
	if (isZero(x)) {
		return one;
	}

	const {
		realValue: rv,
		infinitePart: xp,
		realPart: xr,
		infinitesimalPart: xm,
	} = ensure(x);
	if (rv !== null) {
		return Math.log(Number(rv));
	}

	// exp(sum_i c_i w^p_i) = prod_i exp(c_i w^p_i)
	// = prod_i exp(w^p_i)^c_i
	// = prod_i (w^(w^p_i))^c_i
	// = prod_i w^(w^p_i . c_i)
	const inf = multTerms(xp, (p, c) =>
		// g(x) = x for below epsilon numbers
		mono1(mono(c, g(p))),
	);
	const r = Math.exp(Number(xr));
	const low = isZero(xm) ? one : expLow(xm, terms);
	return mult(mult(inf, r), low);
};

export const log = (x: Conway0, terms: number | null = null): Conway0 => {
	// Given a term
	//   c_lead w^p_lead + c_1 w^p_i + ...,
	// factor it into
	//   (c_lead w^p_lead) (1 + (c_1/c_lead) w^(p_1 - p_lead) + ...)
	// log(c_lead) + log(w^p_lead) + log1pLow(...)
	const x1 = ensure(x);
	const rv = x1.realValue;
	if (rv !== null) {
		return Math.log(Number(rv));
	}

	if (!x1.isPositive) {
		throw new RangeError(x1.isZero ? "log of zero" : "log of negative");
	}

	const { inf, r, low } = factorLeadLow(x1);
	return add(add(logInf(inf), Math.log(Number(r))), log1pLow(low, terms));
};
