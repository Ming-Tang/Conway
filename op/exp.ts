import { ensure, mono, one, zero } from ".";
import { Conway, type Real } from "../conway";
import { sub, mult, powInt, add } from "./arith";
import { eq, isZero } from "./comparison";

/**
 * exp(w^x)
 */
const expLow = (x: Real | Conway, terms = null as number | null) => {
	if (isZero(x)) {
		return one;
	}
	if (terms === null) {
		throw new RangeError("terms is null");
	}

	let sum = zero;
	let f = 1.0;
	let xPow: Real | Conway = Conway.one;
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
export const log1pLow = (x: Real | Conway, terms = null as number | null) => {
	if (Conway.isZero(x)) {
		return one;
	}
	if (terms === null) {
		throw new RangeError("terms is null");
	}

	let sum = zero;
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
const logInf = (x: Real | Conway) => ensure(x).sumTerms((p, c) => mult(p, c));

/**
 * Given a surreal number, factor it into `(r w^inf) * (1 + low)`.
 *
 * @param x The number to be factored, must be positive
 * @returns `{ inf, r, low }` where `inf` is the exponent of the leading term,
 * `r` is the real coefficient of the leading term and `low` is a pure infinitesimal.
 */
export const factorLeadLow = (x: Conway) => {
	const { leadingPower: pLead0, leadingCoeff: r } = x;
	const pLead = pLead0 ?? Conway.zero;
	const inf = pLead;
	const terms: [Real | Conway, Real][] = [];
	for (const [p, c] of x) {
		if (eq(p, pLead)) {
			continue;
		}
		terms.push([sub(p, pLead), Conway.multReal(c, 1.0 / Number(r))]);
	}

	return { inf, r, low: new Conway(terms) };
};

export const exp = (
	x: Real | Conway,
	terms: number | null = null,
): Conway | Real => {
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

	const inf = xp.multTerms((p, c) =>
		// g(x) = x for below epsilon numbers
		Conway.mono(Number(c), mult(p, c)),
	);
	const r = Math.exp(Number(xr));
	const low = isZero(xm) ? one : expLow(xm, terms);
	return Conway.ensure(inf).mult(r).mult(low);
};

export const log = (
	x: Real | Conway,
	terms: number | null = null,
): Conway | Real => {
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
