import { ensure, mono, mono1, one, zero } from ".";
import { Conway, type Conway0 } from "../conway";
import { realMult, type Real } from "../real";
import { sub, mult, add } from "./arith";
import { eq, isZero } from "./comparison";

/**
 * exp(w^x)
 */
const expLow = (x: Conway0, terms = null as number | null) => {
	if (isZero(x)) {
		return one;
	}
	if (terms === null) {
		throw new RangeError("terms is null");
	}

	let sum: Conway = zero;
	let f = 1.0;
	let xPow: Conway0 = one;
	for (let i = 0; i < terms; i++) {
		sum = sum.add(mult(xPow, 1.0 / f));
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

	let sum: Conway = zero;
	let f = 1.0;
	let xPow = x;
	for (let i = 1; i <= terms; i++) {
		sum = sum.add(mult(xPow, f / i));
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
const logInf = (x: Conway0) => ensure(x).sumTerms((p, c) => mult(mono1(p), c));

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

	return { inf, r, low: new Conway(terms) };
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
	const inf = xp.multTerms((p, c) =>
		// g(x) = x for below epsilon numbers
		mono1(mono(c, p)),
	);
	const r = Math.exp(Number(xr));
	const low = isZero(xm) ? one : expLow(xm, terms);
	return ensure(inf).mult(r).mult(low);
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
