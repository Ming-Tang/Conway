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
	for (let i = 0; i < terms; i++) {
		sum = sum.add(mult(powInt(x, i), 1.0 / f));
		f *= i + 1;
	}
	return sum;
};

/**
 * Evaluate the infinite series for `log(1 + x)` where `x` is infinitesimal.
 */
const log1pLow = (x: Real | Conway, terms = null as number | null) => {
	if (Conway.isZero(x)) {
		return one;
	}
	if (terms === null) {
		throw new RangeError("terms is null");
	}

	let sum = zero;
	let f = 1.0;
	for (let i = 1; i <= terms; i++) {
		sum = sum.add(mult(powInt(x, i), f / i));
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

export const exp = (
	x: Real | Conway,
	terms: number | null = null,
): Conway | Real => {
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
	const low = expLow(xm, terms);
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
		throw new RangeError("log of negative");
	}
	const { leadingPower: pLead0, leadingCoeff: cLead } = ensure(x1);
	const pLead = pLead0 ?? Conway.zero;
	const r = Math.log(Number(cLead));
	const inf = logInf(pLead);
	const low = x1.sumTerms((p, c) =>
		eq(p, pLead)
			? zero
			: mono(Conway.multReal(c, 1.0 / Number(cLead)), sub(p, pLead)),
	);
	return add(add(inf, r), log1pLow(low, terms));
};
