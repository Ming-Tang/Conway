import { ensure } from ".";
import { Conway, INSTANCE_IMPLS, STATIC_IMPLS, type Ord } from "../conway";
import {
	realGt,
	realIntegerDiv,
	realIntegerPow,
	realIsPositive,
	realOne,
	realSub,
	realToBigint,
	type Real,
} from "../real";
import { sub, add } from "./arith";
import { isZero, isOne } from "./comparison";

export const { isOrdinal, ordinalAdd, ordinalMult, ordinalRightSub } = Conway;

const ordinalPowFinite = (base: Ord, other: bigint): Ord => {
	if (other === 0n) {
		return Conway.one;
	}
	if (other === 1n) {
		return base;
	}

	const rv = base.realValue;
	if (rv !== null) {
		// finite^finite
		return Conway.ensure(
			typeof rv === "bigint" ? rv ** other : Number(rv) ** Number(other),
		);
	}

	// infinite^finite
	if (other === 2n) {
		return base.ordinalMult(base);
	}

	if (other === 3n) {
		return base.ordinalMult(base).ordinalMult(base);
	}

	const m = ordinalPowFinite(base, other >> 2n);
	const m2 = m.ordinalMult(m);
	const m4 = m2.ordinalMult(m2);
	let prod = m4;
	const mod = other % 4n;
	for (let i = 0n; i < mod; i += 1n) {
		prod = prod.ordinalMult(base);
	}
	return prod;
};

export const ordinalPow = (left: Real | Ord, other: Real | Ord): Real | Ord => {
	if (!(left instanceof Conway)) {
		if (!(other instanceof Conway)) {
			return realIntegerPow(left, other);
		}
	}
	const base = Conway.ensure(left);

	if (!(other instanceof Conway)) {
		return ordinalPowFinite(base, realToBigint(other));
	}

	if (other.isZero) {
		return Conway.one;
	}

	if (base.isZero) {
		return Conway.zero;
	}

	if (base.isOne) {
		return Conway.one;
	}

	if (other.isOne) {
		return base;
	}

	const otherFinite = other.realValue;
	if (otherFinite !== null) {
		return ordinalPowFinite(base, realToBigint(otherFinite));
	}

	const thisFinite = base.realValue;
	let prod = Conway.one;
	if (thisFinite !== null) {
		for (const [p, c] of other) {
			if (Conway.isZero(p)) {
				// finite^finite
				const coeff1 =
					typeof thisFinite === "bigint" && typeof c === "bigint"
						? thisFinite ** c
						: Number(thisFinite) ** Number(c);
				prod = prod.ordinalMult(coeff1);
				continue;
			}

			if (Conway.isOne(p)) {
				// finite^(w.c) = (finite^w)^c = w^c
				prod = prod.ordinalMult(Conway.mono1(c));
				continue;
			}

			// finite^(w^p . c)

			// p is finite:
			// finite^(w^0) = finite
			// finite^(w^(n+1))
			// = finite^(w . w^n) = (finite^w)^(w^n)
			// = w^(w^n)
			// finite^(w^(n+1).c)
			// = w^(w^n.c)

			// p is infinite:
			// = finite^(w^p . c)
			// = w^(w^p . c)
			const prv = Conway.ensure(p).realValue;
			if (prv !== null) {
				const exponent = Conway.ordinalMult(
					Conway.mono1(realSub(prv, realOne)),
					c,
				);
				prod = prod.ordinalMult(Conway.mono1(exponent));
			} else {
				prod = prod.ordinalMult(
					Conway.mono1(Conway.ordinalMult(Conway.mono1(p), c)),
				);
			}
		}

		return prod;
	}

	const leadPow = Conway.ensure(base.leadingPower ?? Conway.zero);
	for (const [p, c] of other) {
		if (Conway.isZero(p)) {
			// x^finite
			prod = prod.ordinalMult(ordinalPowFinite(base, realToBigint(c)));
			continue;
		}
		// x^(w^p . c)
		// = (w^leadPow)^(w^p . c)
		// = w^(leadPow . (w^p . c))
		const prodPow = Conway.mono(
			1n,
			Conway.ordinalMult(leadPow, Conway.mono(c, p)),
		);
		prod = prod.ordinalMult(prodPow);
	}

	return prod;
};

const finiteOrdinalDiv = (value: Real, other: Real) =>
	realIntegerDiv(value, other);

/**
 * Given this number (must be ordinal) `N` and another ordinal number `D`,
 * find `q, r` such that `r < d` and `D * q + r = N`.
 * @param value The divisor
 * @returns The quotient and remainder as a tuple
 */
export const ordinalDivRem = (
	left: Real | Ord,
	right: Real | Ord,
): [Real | Ord, Real | Ord] => {
	if (!(left instanceof Conway) && !(right instanceof Conway)) {
		const n = realToBigint(left);
		const d = realToBigint(right);
		const q = n / d;
		const r = n - q * d;
		return [q, r];
	}

	const num: Ord = Conway.ensure(left);
	const div: Ord = Conway.ensure(right);

	if (Conway.isZero(div)) {
		throw new RangeError("division by zero");
	}

	if (num.isZero) {
		return [num, Conway.zero];
	}

	if (Conway.isOne(div)) {
		return [num, Conway.zero];
	}

	if (Conway.eq(num, div)) {
		return [Conway.one, Conway.zero];
	}

	const rv = div instanceof Conway ? div.realValue : div;
	if (rv !== null) {
		const q = finiteOrdinalDiv(num.leadingCoeff, rv);
		const r = Conway.ordinalRightSub(Conway.ordinalMult(div, q), num);
		return [q, r];
	}

	// div is infinite below

	const v = Conway.ensure(div);
	let quotient: Conway | Real = Conway.zero;
	let remainder: Conway | Real = num;
	// D * ((w^p0).q0 + qRest) + r = (w^P0).C0 + N_Rest
	// ((w^dp0) D0 + ...) * ((w^p0).q0 + ...) + r = (w^P0) C0 + ...
	//  --> (w^dp0 D0) * (w^p0 q0) = (w^P0 C0)
	//      Case 1 (dp0 = P0): w^P0 (D0 q0) = w^P0 C0 --> use division
	//      Case 2           : w^P0 w^p0 q0 = w^P0 C0 --> q0 = c0, p0 = subtraction
	// (p0, q0) = divMono(dp0, D0, p0, q0)
	// D * qRest + (r + ...) = N_Rest

	for (const [pUpper, cUpper] of num) {
		const pd0 = v.leadingPower ?? Conway.zero;
		const cd0 = v.leadingCoeff ?? Conway.zero;
		if (Conway.lt(pUpper, pd0)) {
			break;
		}

		const de = Conway.ordinalRightSub(pd0, pUpper);
		const cr = Conway.isZero(de) ? finiteOrdinalDiv(cUpper, cd0) : cUpper;
		if (!cr) {
			continue;
		}

		let dq = Conway.mono(cr, de);
		let toSub = Conway.ordinalMult(div, dq);
		if (Conway.lt(remainder, toSub)) {
			if (realGt(cr, realOne)) {
				const cr1 = realSub(cr, realOne);
				const dq1 = Conway.mono(cr1, de);
				const toSub1 = Conway.ordinalMult(div, dq1);
				if (Conway.lt(remainder, toSub1)) {
					break;
				}
				dq = dq1;
				toSub = toSub1;
			} else {
				break;
			}
		}
		quotient = Conway.ordinalAdd(quotient, dq);
		remainder = Conway.ordinalRightSub(toSub, remainder);
	}

	return [quotient, remainder];
};

STATIC_IMPLS.ordinalDivRem = ordinalDivRem;
INSTANCE_IMPLS.ordinalDivRem = (x, y) => {
	const [a, b] = ordinalDivRem(x, y);
	return [ensure(a), ensure(b)];
};

STATIC_IMPLS.ordinalPow = ordinalPow;
INSTANCE_IMPLS.ordinalPow = (x, y) => ensure(ordinalPow(x, y));

export const isLimit = (x: Real | Conway): x is Conway =>
	x instanceof Conway && !isZero(x) && isZero(x.realPart);
export const isSucc = (x: Real | Conway) =>
	x instanceof Conway ? realIsPositive(x.realPart) : realIsPositive(x);

export const noSucc = (x: Real | Conway) =>
	x instanceof Conway ? sub(x, x.realPart) : 0n;

export const succ = (x: Real | Conway) => add(x, 1n);
export const pred = (x: Real | Conway) => sub(x, 1n);

/**
 * Get the nth element of the canonical sequence of a limit ordinal.
 * A limit ordinal can be constructed through the canonical sequence.
 *
 * Defined for `n >= 1` in "Fusible Numbers and Peano Arithmetic" section 3.
 * When `n = 0`, the limiting term will be removed.
 *
 * @param x The limit ordinal
 * @param limitCoeff The trailing coefficient when the trailing term is a limit ordinal
 * @param n The index (natural number) of the sequence
 */
export const canon = (x: Conway, n: Real, limitCoeff = 1n): Real | Conway => {
	if (isZero(x) || !x.isOrdinal || isSucc(x)) {
		throw new RangeError("Must be a limit ordinal");
	}

	const idx = x.length - 1;
	const terms = [...x] as [Conway | Real, Real][];
	const [p, c] = terms[idx];
	const preTerms = terms.slice(0, idx);
	if (isOne(c)) {
		// ... + w^p
		if (isLimit(p)) {
			// ... + w^pLim
			const pow = canon(p, n);
			return new Conway([...preTerms, [pow, n ? limitCoeff : 0n]]);
		}

		// ... + w^(p0 + 1)
		const p0 = pred(p);
		return new Conway([...preTerms, [p0, n]]);
	}

	const c0 = realSub(c, realOne);
	if (isLimit(p)) {
		// ... + w^pn (p + 1)
		return new Conway([
			...preTerms,
			[p, c0],
			[canon(p, n), n ? limitCoeff : 0n],
		]);
	}

	// ... + w^(p0 + 1) * (c0 + 1)
	return new Conway([...preTerms, [p, c0], [pred(p), n]]);
};
