import { create } from ".";
import { Conway, type Conway0, type Ord, type Ord0 } from "../conway";
import {
	type Real,
	realAdd,
	realGt,
	realIntegerDiv,
	realIntegerPow,
	realIsNegative,
	realIsPositive,
	realLt,
	realMult,
	realOne,
	realSub,
	realToBigint,
} from "../real";
import { add, addWrapped, multWrapped, sub } from "./arith";
import { isOne, isZero } from "./comparison";

export const { isOrdinal } = Conway;

const {
	compare,
	eq,
	mono: _mono,
	mono1: _mono1,
	ensure: _ensure,
	zero,
	one,
} = Conway;

export function assertOrd(x: Conway0): asserts x is Ord0 {
	if (!isOrdinal(x)) {
		throw new RangeError(`must be an ordinal number: ${x}`);
	}
}

const mono1 = _mono1 as (p: Ord0) => Ord;
export const ordinalMono1 = (p: Ord0): Ord => {
	assertOrd(p);
	return mono1(p);
};

const mono = _mono as (c: Ord0, p: Ord0) => Ord;
export const ordinalMono = (c: Ord0, p: Ord0): Ord => {
	assertOrd(c);
	assertOrd(p);
	return mono(c, p);
};

const ensure = _ensure as (x: Ord0) => Ord;
export const ordinalEnsure = (v: Ord0): Ord => {
	assertOrd(v);
	return ensure(v);
};

export const ordinalAddWrapped = (ord: Ord, other: Ord0): Ord => {
	if (!(other instanceof Conway)) {
		return addWrapped(ord, other as Ord0);
	}

	const cutoff = other.leadingPower;
	if (cutoff === null) {
		return addWrapped(ord, other);
	}

	return addWrapped(
		ord.filterTerms((p1) => compare(p1, cutoff) <= 0),
		other,
	) as Ord;
};

/**
 * Performs ordinal number addition.
 * Does not check if `this` and `other` are both ordinals.
 */
export const ordinalAdd = (left: Ord0, right: Ord0): Ord0 => {
	if (!(left instanceof Conway) && !(right instanceof Conway)) {
		return realAdd(left, right);
	}
	const l1 = ensure(left);
	const r1 = ensure(right);
	return ordinalAddWrapped(l1, r1);
};

const ordinalMultInfiniteFinite = (inf: Ord, i: Real): Ord0 => {
	if (isZero(i)) {
		return zero;
	}
	if (isOne(i)) {
		return inf;
	}
	if (realIsNegative(i)) {
		throw new Error("Multiplier cannot be negative");
	}

	if (typeof i === "bigint") {
		if (i === 2n) {
			return ordinalAdd(inf, inf);
		}
		const pred = i - 1n;
		const { leadingPower: p0, leadingCoeff: c0 } = inf;
		return ordinalAdd(mono(realMult(c0, pred), p0 ?? zero), inf);
	}
	return ordinalMultInfiniteFinite(inf, realToBigint(i));
};

export const ordinalMultWrapped = (ord: Ord, other: Ord0): Ord => {
	if (!(other instanceof Conway)) {
		return multWrapped(ord, other) as Ord;
	}

	if (ord.isZero || other.isZero) {
		return zero;
	}
	if (ord.isOne) {
		return other;
	}
	if (other.isOne) {
		return ord;
	}

	const { realPart: i1 } = ord;
	const { realPart: i2 } = other;
	// i1 * i2 = i1 * i2
	if (!ord.isAboveReals && !other.isAboveReals) {
		return ensure(realMult(i1, i2));
	}
	// (...) * i2
	if (!other.isAboveReals) {
		return ensure(ordinalMultInfiniteFinite(ord, i2));
	}
	if (!ord.isAboveReals) {
		const { infinitePart: inf2 } = other;
		// i1 nonzero: i1 * (inf2 + i2) = inf2 + i1 * i2
		return isZero(i1) ? zero : (addWrapped(inf2, realMult(i1, i2)) as Ord);
	}
	const p0 = ord.leadingPower ?? zero;
	let tot = zero;
	for (const [p, c] of other) {
		if (isZero(p)) {
			tot = ordinalAddWrapped(tot, ordinalMultInfiniteFinite(ord, c));
			continue;
		}
		tot = ordinalAddWrapped(tot, mono(c, ordinalAdd(p0, p)));
	}
	return tot;
};

/**
 * Performs ordinal number multiplication.
 * Does not check if `this` and `other` are both ordinals.
 */
export const ordinalMult = (left: Ord0, right: Ord0): Ord0 => {
	if (!(left instanceof Conway) && !(right instanceof Conway)) {
		return realMult(left, right);
	}
	const l1 = ensure(left);
	const r1 = ensure(right);
	return ordinalMultWrapped(l1, r1);
};

export const ordinalRightSubWrapped = (ord: Ord, other: Ord0): Ord => {
	const c = Conway.compare(ord, other);
	if (c < 0) {
		throw new RangeError(`No solution: ${ord} > ${other.toString()}`);
	}
	if (c === 0) {
		return zero;
	}

	const other1 = ensure(other);
	if (ord.isZero) {
		return other1;
	}

	let left: Ord = ord;
	let right = other1;
	while (left.length > 0 && right.length > 0) {
		const leftTerms = left.terms;
		const rightTerms = right.terms;
		const [p2, c2] = rightTerms[0];
		const [p1, c1] = leftTerms[0];
		if (!eq(p1, p2)) {
			break;
		}

		const diffCoeff = realSub(c2, c1);
		if (isZero(diffCoeff)) {
			left = create(leftTerms.slice(1));
			right = create(rightTerms.slice(1));
			continue;
		}

		return create([[p1, realSub(c2, c1)], ...rightTerms.slice(1)]);
	}

	return right;
};

/**
 * Find the solution `x` such that `ordinalAdd(left, x).eq(right)`.
 */
export const ordinalRightSub = (left: Ord0, right: Ord0): Ord0 => {
	if (!(left instanceof Conway) && !(right instanceof Conway)) {
		if (realLt(right, left)) {
			throw new RangeError(`No solution: ${left} + ? = ${right}`);
		}
		return realSub(right, left);
	}

	const l1 = ensure(left);
	return ordinalRightSubWrapped(l1, right);
};

const ordinalPowFinite = (base: Ord, other: bigint): Ord => {
	if (other === 0n) {
		return one;
	}
	if (other === 1n) {
		return base;
	}

	const rv = base.realValue;
	if (rv !== null) {
		// finite^finite
		return ensure(
			typeof rv === "bigint" ? rv ** other : Number(rv) ** Number(other),
		);
	}

	// infinite^finite
	if (other === 2n) {
		return ordinalMultWrapped(base, base);
	}

	if (other === 3n) {
		return ordinalMultWrapped(ordinalMultWrapped(base, base), base);
	}

	const m = ordinalPowFinite(base, other >> 2n);
	const m2 = ordinalMultWrapped(m, m);
	const m4 = ordinalMultWrapped(m2, m2);
	let prod = m4;
	const mod = other % 4n;
	for (let i = 0n; i < mod; i += 1n) {
		prod = ordinalMultWrapped(prod, base);
	}
	return prod;
};

export const ordinalPowWrapped = (base: Ord, other: Ord0): Ord => {
	if (!(other instanceof Conway)) {
		return ordinalPowFinite(base, realToBigint(other));
	}

	if (other.isZero) {
		return one;
	}

	if (base.isZero) {
		return zero;
	}

	if (base.isOne) {
		return one;
	}

	if (other.isOne) {
		return base;
	}

	const otherFinite = other.realValue;
	if (otherFinite !== null) {
		return ordinalPowFinite(base, realToBigint(otherFinite));
	}

	const thisFinite = base.realValue;
	let prod = one;
	if (thisFinite !== null) {
		for (const [p, c] of other) {
			if (isZero(p)) {
				// finite^finite
				const coeff1 =
					typeof thisFinite === "bigint" && typeof c === "bigint"
						? thisFinite ** c
						: Number(thisFinite) ** Number(c);
				prod = ordinalMultWrapped(prod, coeff1);
				continue;
			}

			if (isOne(p)) {
				// finite^(w.c) = (finite^w)^c = w^c
				prod = ordinalMultWrapped(prod, mono1(c));
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
			const prv = ensure(p).realValue;
			if (prv !== null) {
				const exponent = ordinalMult(mono1(realSub(prv, realOne)), c);
				prod = ordinalMultWrapped(prod, mono1(exponent));
			} else {
				prod = ordinalMultWrapped(prod, mono1(ordinalMult(mono1(p), c)));
			}
		}

		return ensure(prod);
	}

	const leadPow = ensure(base.leadingPower ?? zero);
	for (const [p, c] of other) {
		if (isZero(p)) {
			// x^finite
			prod = ordinalMultWrapped(prod, ordinalPowFinite(base, realToBigint(c)));
			continue;
		}
		// x^(w^p . c)
		// = (w^leadPow)^(w^p . c)
		// = w^(leadPow . (w^p . c))
		const prodPow = mono(1n, ordinalMult(leadPow, mono(c, p)));
		prod = ordinalMultWrapped(prod, prodPow);
	}

	return prod;
};

export const ordinalPow = (left: Ord0, right: Ord0): Ord0 => {
	if (!(left instanceof Conway) && !(right instanceof Conway)) {
		return realIntegerPow(left, right);
	}
	return ordinalPowWrapped(ensure(left), right);
};

const finiteOrdinalDiv = (value: Real, other: Real) =>
	realIntegerDiv(value, other);

export const ordinalDivRemWrapped = (num: Ord, div: Ord0): [Ord, Ord] => {
	if (isZero(div)) {
		throw new RangeError("division by zero");
	}

	if (num.isZero) {
		return [num, zero];
	}

	if (isOne(div)) {
		return [num, zero];
	}

	if (eq(num, div)) {
		return [one, zero];
	}

	const rv = div instanceof Conway ? div.realValue : div;
	if (rv !== null) {
		const q = finiteOrdinalDiv(num.leadingCoeff, rv);
		const r = ordinalRightSub(ordinalMult(div, q), num);
		return [ensure(q), ensure(r)];
	}

	// div is infinite below

	const v = ensure(div);
	let quotient: Ord = zero;
	let remainder: Ord = num;
	// D * ((w^p0).q0 + qRest) + r = (w^P0).C0 + N_Rest
	// ((w^dp0) D0 + ...) * ((w^p0).q0 + ...) + r = (w^P0) C0 + ...
	//  --> (w^dp0 D0) * (w^p0 q0) = (w^P0 C0)
	//      Case 1 (dp0 = P0): w^P0 (D0 q0) = w^P0 C0 --> use division
	//      Case 2           : w^P0 w^p0 q0 = w^P0 C0 --> q0 = c0, p0 = subtraction
	// (p0, q0) = divMono(dp0, D0, p0, q0)
	// D * qRest + (r + ...) = N_Rest

	for (const [pUpper, cUpper] of num) {
		const pd0 = v.leadingPower ?? zero;
		const cd0 = v.leadingCoeff ?? zero;
		if (compare(pUpper, pd0) > 0) {
			break;
		}

		const de = ordinalRightSub(pd0, pUpper);
		const cr = isZero(de) ? finiteOrdinalDiv(cUpper, cd0) : cUpper;
		if (!cr) {
			continue;
		}

		let dq = mono(cr, de);
		const div1 = ensure(div);
		let toSub = ordinalMultWrapped(div1, dq);
		if (compare(remainder, toSub) > 0) {
			if (realGt(cr, realOne)) {
				const cr1 = realSub(cr, realOne);
				const dq1 = mono(cr1, de);
				const toSub1 = ordinalMultWrapped(div1, dq1);
				if (compare(remainder, toSub1) > 0) {
					break;
				}
				dq = dq1;
				toSub = toSub1;
			} else {
				break;
			}
		}
		quotient = ordinalAddWrapped(quotient, dq);
		remainder = ordinalRightSubWrapped(ensure(toSub), remainder);
	}

	return [quotient, remainder];
};

/**
 * Given this number (must be ordinal) `N` and another ordinal number `D`,
 * find `q, r` such that `r < d` and `D * q + r = N`.
 * @param value The divisor
 * @returns The quotient and remainder as a tuple
 */
export const ordinalDivRem = (left: Ord0, right: Ord0): [Ord0, Ord0] => {
	if (!(left instanceof Conway) && !(right instanceof Conway)) {
		const n = realToBigint(left);
		const d = realToBigint(right);
		const q = n / d;
		const r = n - q * d;
		return [q, r];
	}

	return ordinalDivRemWrapped(ensure(left), ensure(right));
};

export const isLimit = (x: Ord0): x is Ord =>
	x instanceof Conway && !isZero(x) && isZero(x.realPart);
export const isSucc = (x: Ord0) =>
	x instanceof Conway ? realIsPositive(x.realPart) : realIsPositive(x);

export const noSucc = (x: Ord0): Ord0 =>
	(x instanceof Conway ? sub(x, x.realPart) : 0n) as Ord0;

export const succ = (x: Ord0): Ord0 => add(x, 1n);
export const pred = (x: Ord0) => sub(x, 1n) as Ord0;

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
export const canon = (x: Ord, n: Real, limitCoeff = 1n): Ord0 => {
	if (isZero(x) || !x.isOrdinal || isSucc(x)) {
		throw new RangeError("Must be a limit ordinal");
	}

	const idx = x.length - 1;
	const terms = [...x] as [Ord0, Real][];
	const [p, c] = terms[idx];
	const preTerms = terms.slice(0, idx);
	if (isOne(c)) {
		// ... + w^p
		if (isLimit(p)) {
			// ... + w^pLim
			const pow = canon(p, n);
			return create([...preTerms, [pow, n ? limitCoeff : 0n]]) as Ord;
		}

		// ... + w^(p0 + 1)
		const p0 = pred(p);
		return create([...preTerms, [p0, n]]) as Ord;
	}

	const c0 = realSub(c, realOne);
	if (isLimit(p)) {
		// ... + w^pn (p + 1)
		return create([
			...preTerms,
			[p, c0],
			[canon(p, n), n ? limitCoeff : 0n],
		]) as Ord;
	}

	// ... + w^(p0 + 1) * (c0 + 1)
	return create([...preTerms, [p, c0], [pred(p), n]]) as Ord;
};
