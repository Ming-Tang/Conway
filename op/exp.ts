import {
	create,
	ensure,
	mono,
	mono1,
	one,
	tryGetFiniteOrd,
	unit,
	zero,
} from ".";
import type { Conway, Conway0 } from "../conway";
import { dyadicPow2 } from "../dyadic/arith";
import { type Real, realMult, realToBigint } from "../real";
import { signExpansion } from "../signExpansion";
import {
	conwayFromSignExpansion,
	iterSignExpansionReader,
	makeReader,
	signExpansionFromConway,
} from "../signExpansion/reader";
import { add, mult, sub } from "./arith";
import { multTerms, sumTerms } from "./collection";
import { eq, isNegative, isOne, isPositive, isZero } from "./comparison";
import { isSucc, ordinalDivRem, pred } from "./ordinal";

/**
 * Gets the Archimedean class of a given non-zero surreal.
 * Defined as the "ind" in the proof of [Gonshor] Theorem 10.10.
 * @throws `RangeError` if `x` is zero.
 * @returns `p` given `x ~ w^p`
 */
export const index = (x: Conway0): Conway0 => {
	if (isZero(x)) {
		throw new RangeError("index: cannot be zero");
	}

	const terms = ensure(x).terms;
	return terms[0][0];
};

/**
 * `g : No[>0] -> No`
 * `g(x) = { index(x), g(L(x)) | h(g(x)) }`
 * `x ~ w^index(x)`
 */
export const g = (x: Conway0): Conway0 => {
	if (!isPositive(x)) {
		throw new RangeError("g: cannot be negative");
	}
	const ind = index(x);
	if (!isNegative(ind)) {
		// Theorem 10.20 applies
		return x;
	}

	const reader = makeReader(signExpansionFromConway(x));
	const plus = reader.lookahead();
	if (plus === null || plus.sign === false || !isOne(plus.length)) {
		throw new Error("not possible: +");
	}
	reader.consume(1n);
	const minuses = reader.lookahead();
	if (minuses === null || minuses.sign === true || isZero(minuses.length)) {
		throw new Error("not possible: -");
	}
	const nMinus = minuses.length;
	reader.consume(nMinus);

	const [b, n] = ordinalDivRem(nMinus, unit);
	const nBigint = tryGetFiniteOrd(n) ?? 0n;

	// Now the sign expansion has two forms:
	// a. [+ -^(w b + n)] = w^-b * 2^-n
	// b. [+ -^(w b + n) + S] where S is any sign expansion
	// where b is a non-zero ordinal and n is a natural number
	// Theorem 10.15 applies in (a)

	const rest = reader.lookahead();
	const base = sub(dyadicPow2(-nBigint), b);
	if (rest === null) {
		// Case (a) Theorem 10.15: g(x) = -b + 2^-n
		return base;
	}
	// Case (b):
	//  - If b is limit: (-b + 1) & S
	//  - If b is successor: (-b + 1 + w^-1) & S
	//
	// Proof for case (b): Given ordinal b and natural number n
	// Let x = plus(w^[-b] 2^-n) = w^[-b] {2^-n|} = [+ -^[w b + n] +]
	// g(x) = { index(x), g(w^[-b] 2^-n) | g(R(w^[-b])) }
	// g(x) = { -b, -b + 2^-n | -L(b) + 2^-k, positive real numbers }
	// g(x) = { -b + 2^-n | -L(b) + 2^-k }
	// If b is limit, L(b) is a limiting sequence:
	//   g(x) = { -b + 2^-n | -L(b) }
	//        = { [-^b + -^n] | [-^L(b)] }
	//        = [-^b +] = -b + 1
	// If b is successor, L(b) = b - 1:
	//   g(x) = { -b + 2^-n | -b + 1 + 2^-k }
	//        = { -b + 1 | -b + 1 + 2^-k }
	//        = -b + 1 + w^-1
	// For sign expansions [+ -^(wb + n) + S] = [x S] in general,
	//   g([x S]) = g(x) & S.
	// The evaluation of index([x S']) stays unchanged through each
	// truncation of S, S'.

	if (rest.sign === false) {
		throw new Error("not possible: -");
	}

	reader.consume(1n);
	if (isSucc(b)) {
		return conwayFromSignExpansion(
			makeReader([
				{ sign: false, length: pred(b) },
				{ sign: true, length: 1n },
				{ sign: false, length: unit },
				...iterSignExpansionReader(reader),
			]),
		);
	}
	return conwayFromSignExpansion(
		makeReader([
			{ sign: false, length: b },
			{ sign: true, length: 1n },
			...iterSignExpansionReader(reader),
		]),
	);
};

/**
 * `h : No -> No[>0]`
 * `h(x) = { 0, h(L(x)) | h(R(x)), w^x/2^k }`
 * `h` is the inverse of `g`.
 */
const h = (x: Conway0): Conway0 => {
	if (isPositive(x) && !isNegative(index(x))) {
		return x;
	}
	throw new Error("TODO implement this");
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
