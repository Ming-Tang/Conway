import { Conway, type Real } from "../conway";

export const isOrdinal = Conway.isOrdinal;
export const ordinalAdd = Conway.ordinalAdd;
export const ordinalMult = Conway.ordinalMult;
export const ordinalRightSub = Conway.ordinalRightSub;
export const ordinalDivRem = Conway.ordinalDivRem;

export const isLimit = (x: Real | Conway): x is Conway =>
	x instanceof Conway && !Conway.isZero(x) && Conway.isZero(x.realPart);
export const isSucc = (x: Real | Conway) =>
	x instanceof Conway ? x.realPart > 0 : x > 0;

export const noSucc = (x: Real | Conway) =>
	x instanceof Conway ? Conway.sub(x, x.realPart) : 0n;

export const succ = (x: Real | Conway) => Conway.add(x, 1n);
export const pred = (x: Real | Conway) => Conway.sub(x, 1n);

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
	if (!x.isOrdinal || isSucc(x)) {
		throw new RangeError("Must be a limit ordinal");
	}

	const idx = x.length - 1;
	const terms = [...x] as [Conway | Real, Real][];
	const [p, c] = terms[idx];
	const preTerms = terms.slice(0, idx);
	if (Conway.isOne(c)) {
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

	const c0 = Conway.addReal(c, -1n);
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
