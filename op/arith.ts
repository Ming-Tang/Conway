import { create, ensure, eq, isOne, isZero, one, zero } from ".";
import {
	type BothIsOrd,
	Conway,
	type Conway0,
	type InferIsOrd,
} from "../conway";
import {
	type Real,
	realAdd,
	realMult,
	realNeg,
	realSub,
	realZero,
} from "../real";

// TODO rename away 0 suffix

export const negWrapped = (x: Conway): Conway => {
	return create(
		x.terms.map(([e, c]) => [e, realNeg(c)]),
		true,
	);
};

export const neg = (value: Conway0): Conway0 => {
	return value instanceof Conway ? negWrapped(value) : realNeg(value);
};

export const addWrapped = <
	IsOrd extends boolean = boolean,
	B extends Conway0 = Conway0,
>(
	x: Conway<IsOrd>,
	other: B,
): Conway<BothIsOrd<IsOrd, InferIsOrd<B>>> => {
	if (isZero(other)) {
		return x as never;
	}

	if (!(other instanceof Conway)) {
		const newTerms: [Conway0<never>, Real][] = [];
		let added = false;
		for (const [e1, c1] of x) {
			if (!added && isZero(e1)) {
				newTerms.push([e1 as Conway0<never>, realAdd(c1, other)]);
				added = true;
			} else {
				newTerms.push([
					e1 as Conway0<never>,
					isZero(e1) ? realAdd(c1, other) : c1,
				]);
			}
		}
		if (!added) {
			newTerms.push([realZero, other]);
		}
		return create<never>(newTerms);
	}

	const terms: [Conway0<never>, Real][] = [];
	for (const [e1, c1] of ensure(other)) {
		terms.push([e1 as Conway0<never>, c1]);
	}

	for (const [e1, c1] of x) {
		const found = terms.find(([e]) => eq(e, e1));
		if (!found) {
			terms.push([e1 as Conway0<never>, c1]);
		} else {
			found[1] = realAdd(found[1], c1);
		}
	}
	return create<never>(terms);
};

export const add = <A extends Conway0 = Conway0, B extends Conway0 = Conway0>(
	left: A,
	right: B,
): Conway0<BothIsOrd<InferIsOrd<A>, InferIsOrd<B>>> => {
	if (!(left instanceof Conway) && !(right instanceof Conway)) {
		return realAdd(left, right);
	}
	const l1 = ensure(left);
	const r1 = ensure(right);
	return addWrapped(l1, r1) as Conway<never>;
};

export const subWrapped = (x: Conway, other: Conway0): Conway =>
	addWrapped(x, other instanceof Conway ? negWrapped(other) : realNeg(other));

export const sub = (left: Conway0, right: Conway0): Conway0 => {
	if (!(left instanceof Conway) && !(right instanceof Conway)) {
		return realSub(left, right);
	}
	const l1 = ensure(left);
	const r1 = ensure(right);
	return subWrapped(l1, r1);
};

export const multWrapped = <
	IsOrd extends boolean = boolean,
	A extends Conway0 = Conway0,
>(
	x: Conway<IsOrd>,
	other: A,
): Conway<BothIsOrd<IsOrd, InferIsOrd<A>>> => {
	if (isZero(other)) {
		return zero as Conway<never>;
	}

	if (isOne(other)) {
		return x as never;
	}

	if (!(other instanceof Conway)) {
		const newTerms: [Conway0<never>, Real][] = [];
		for (const [e1, c1] of x) {
			newTerms.push([e1 as Conway0<never>, realMult(c1, other)]);
		}
		return create<never>(newTerms);
	}

	const terms: [Conway0<never>, Real][] = [];

	for (const [e1, c1] of x) {
		for (const [e2, c2] of other) {
			const e3 = add(e1, e2);
			const found = terms.find(([e]) => eq(e, e3));
			const prod = realMult(c1, c2);
			if (!found) {
				terms.push([e3 as Conway0<never>, prod]);
			} else {
				found[1] = realAdd(found[1], prod);
			}
		}
	}
	return create<never>(terms);
};

export const mult = <A extends Conway0 = Conway0, B extends Conway0 = Conway0>(
	left: A,
	right: B,
): Conway0<BothIsOrd<InferIsOrd<A>, InferIsOrd<B>>> => {
	if (typeof left === "bigint" && typeof right === "bigint") {
		return left * right;
	}
	if (typeof left === "number" && typeof right === "number") {
		return left * right;
	}
	const l1 = ensure(left);
	const r1 = ensure(right);
	return multWrapped(l1, r1) as Conway<never>;
};

const powBigint = (value: Conway, pow: bigint): Conway => {
	if (pow === 0n) {
		return one;
	}
	if (pow === 1n) {
		return value;
	}
	if (pow === 2n) {
		return multWrapped(value, value);
	}
	if (pow % 2n === 1n) {
		const p = powBigint(value, (pow - 1n) >> 1n);
		return multWrapped(multWrapped(value, p), p);
	}
	const p = powBigint(value, pow >> 1n);
	return multWrapped(p, p);
};

const powNumberInt = (value: Conway, pow: number): Conway => {
	if (pow === 0) {
		return one;
	}
	if (pow === 1) {
		return value;
	}
	if (pow === 2) {
		return multWrapped(value, value);
	}
	if (pow % 2 === 1) {
		const p = powNumberInt(value, (pow - 1) >> 1);
		return multWrapped(multWrapped(value, p), p);
	}
	const p = powNumberInt(value, pow >> 1);
	return multWrapped(p, p);
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
