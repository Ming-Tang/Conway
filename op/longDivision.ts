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
