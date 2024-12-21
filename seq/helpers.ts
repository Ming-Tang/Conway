import type { Conway, Ord } from "../conway";
import { one, unit } from "../op";
import { ge, isAboveReals, le } from "../op/comparison";
import { ordinalEnsure as ensure, ordinalDivRem } from "../op/ordinal";
import { realIsNegative } from "../real";

export const ensureOrd = (x: Conway): x is Ord => {
	return x.isOrdinal;
};

export const ordFromNumber = (x: number) => {
	return ensure(x) as Ord;
};

export const isConstantLength = (x: Ord) => le(x, one);
export const isConstantArray = <T>(xs: T[]) => {
	if (xs.length <= 1) {
		return true;
	}
	const v = xs[0];
	for (let i = 1; i < xs.length; i++) {
		if (xs[i] !== v) {
			return false;
		}
	}
	return true;
};

export const ensureFinite = (x: Ord): number => {
	const rv = x.realValue;
	if (
		rv === null ||
		realIsNegative(rv) ||
		(typeof x === "number" && !Number.isInteger(x))
	) {
		throw new RangeError(
			"must be zero or positive integer. Cannot be infinite.",
		);
	}
	return Number(x);
};

export const assertLength = (index: Ord, length: Ord) => {
	if (!index.isOrdinal) {
		throw new RangeError(`index is not an ordinal number: ${index}`);
	}
	if (ge(index, length)) {
		throw new RangeError(
			`index out of bounds, index=${index}, length=${length}`,
		);
	}
};

export const modifiedDivRem = (
	i: Ord,
	leftLen: Ord,
	rightLen: Ord,
	prodLen: Ord,
): [Ord, Ord] => {
	const [q, r0] = ordinalDivRem(i, leftLen);
	const r = ensure(r0);
	if (ge(r, leftLen)) {
		if (isAboveReals(prodLen) && !isAboveReals(leftLen)) {
			// Handling finite * infinite: divide out the infinite part and use finite remainder
			const r1 = ordinalDivRem(i, unit)[1];
			const [q1, r2] = ordinalDivRem(r1, leftLen);
			return [ensure(q1), ensure(r2)];
		}
		throw new RangeError(
			`Remainder is too large. |left| = ${leftLen}, |right|=${rightLen}, |prod|=${prodLen}, index=${i}, remainder = ${r}`,
		);
	}

	return [ensure(q), r];
};
