import { ensure, maybeUnwrap, mono, zero } from ".";
import { Conway, type Conway0 } from "../conway";
import { realLongDivision, realLongDivisionLossy } from "../real";
import { add, mult, sub } from "./arith";
import { isOne, isZero } from "./comparison";

const longDivisionConway = (
	n: Conway,
	d: Conway0,
	divReal = realLongDivisionLossy,
): [Conway0, Conway0] => {
	if (isZero(d)) {
		throw new RangeError("division by zero");
	}
	if (isOne(d)) {
		return [n, zero];
	}
	if (isZero(n)) {
		return [zero, zero];
	}

	const [pn, cn] = n.terms[0] ?? [0n, 0n];
	const [pd, cd] = ensure(d).terms[0] ?? [0n, 0n];
	const [cq] = divReal(cn, cd);
	const q = mono(cq, sub(pn, pd));
	return [q, sub(n, mult(q, d))];
};

/**
 * Given two surreal numbers, perform long division on them and return
 * the quotient and remainder.
 *
 * The elimination of the leading term cannot be guaranteed if perfect
 * precision on real number division is demanded, in that case, the leading
 * term can never become zero in any number of steps.
 *
 * @param n The numerator
 * @param d The divisor
 * @param divReal The callback to perform real long division. The default
 * implementation will perform lossy division with zero remainder if one
 * or both operands are numbers, guaranteeing the elimination of the
 * leading term if lossy `number`s are passed.
 * @returns = The tuple for the quotient and remainder.
 */
export const longDivision = (
	n: Conway0,
	d: Conway0,
	divReal = realLongDivisionLossy,
): [Conway0, Conway0] => {
	if (!(n instanceof Conway) && !(d instanceof Conway)) {
		return realLongDivision(n, d);
	}

	const [q, r] = longDivisionConway(ensure(n), ensure(d), divReal);
	return [maybeUnwrap(q), maybeUnwrap(r)];
};

/**
 * Performs long division repeatedly.
 * @see `longDivision` for more details.
 */
export const longDivisionIters = (
	n: Conway0,
	d: Conway0,
	iters: number | bigint,
	divReal = realLongDivisionLossy,
): [Conway0, Conway0] => {
	let q = 0n as Conway0;
	let r = n as Conway0;
	const iters1 = BigInt(iters);
	for (let i = 0n; !isZero(r) && i < iters1; i++) {
		const [q1, r1] = longDivision(r, d, divReal);
		q = add(q, q1);
		r = r1;
	}
	return [q, r];
};
