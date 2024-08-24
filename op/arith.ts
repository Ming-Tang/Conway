import { one, ensure } from ".";
import { Conway, type Conway0 } from "../conway";

export const { neg, add, sub, mult } = Conway;
export const divRem = (a: Conway, b: Conway0) => a.divRem(b);
export const divRemIters = (a: Conway, b: Conway0, n: number) =>
	a.divRemIters(b, n);

const powBigint = (value: Conway, pow: bigint): Conway => {
	if (pow === 0n) {
		return one;
	}
	if (pow === 1n) {
		return value;
	}
	if (pow === 2n) {
		return value.mult(value);
	}
	if (pow % 2n === 1n) {
		const p = powBigint(value, (pow - 1n) >> 1n);
		return value.mult(p).mult(p);
	}
	const p = powBigint(value, pow >> 1n);
	return p.mult(p);
};

const powNumberInt = (value: Conway, pow: number): Conway => {
	if (pow === 0) {
		return one;
	}
	if (pow === 1) {
		return value;
	}
	if (pow === 2) {
		return value.mult(value);
	}
	if (pow % 2 === 1) {
		const p = powNumberInt(value, (pow - 1) >> 1);
		return value.mult(p).mult(p);
	}
	const p = powNumberInt(value, pow >> 1);
	return p.mult(p);
};

export const powInt = (value: Conway0, pow: number | bigint): Conway => {
	if (pow < 0) {
		throw new RangeError("negative power");
	}
	if (pow === 0) {
		return one;
	}
	if (pow === 1n || pow === 1) {
		return ensure(value);
	}
	if (typeof pow === "number" && !Number.isInteger(pow)) {
		throw new RangeError("non-integer power");
	}

	if (typeof pow === "bigint") {
		return powBigint(ensure(value), pow);
	}
	return powNumberInt(ensure(value), pow);
};
