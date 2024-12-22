import { signExpansion } from ".";
import type { Conway, Conway0, Ord, Ord0 } from "../conway";
import {
	birthday,
	ensure,
	eq,
	ge,
	gt,
	isNegative,
	isOne,
	isZero,
	le,
	lt,
	maybeUnwrap,
	ne,
	one,
	zero,
} from "../op";
import { neg } from "../op/arith";
import { succ } from "../op/ordinal";
import type { Seq } from "../seq";
import { assertLength } from "../seq/helpers";
import { type Entry, makeReader } from "./reader";
import {
	conwayFromSignExpansion,
	signExpansionFromConway,
} from "./reader/normalForm";
import {
	commonPrefix,
	countSigns,
	findIndexToSign,
	truncate,
} from "./reader/split";

/**
 * Given two surreal numbers, return the surreal number that has the highest birthday
 * and are simpler than both of them.
 */
export const commonAncestor = <IsOrd extends boolean = boolean>(
	a: Conway0<IsOrd>,
	b: Conway0<IsOrd>,
): Conway0<IsOrd> => {
	const sa = signExpansionFromConway(a);
	const sb = signExpansionFromConway(b);
	const sc = commonPrefix(makeReader(sa), makeReader(sb));
	return maybeUnwrap(conwayFromSignExpansion(makeReader(sc)) as Conway<never>);
};

/**
 * Given a surreal number `x`, returns a simlper surreal number
 * with birthday `length`.
 */
export const truncateConway = (x: Conway0, length: Ord0): Conway0 => {
	const c = truncate(makeReader(signExpansionFromConway(x)), length);
	return conwayFromSignExpansion(makeReader(c));
};

/**
 * Given two surreal numbers `a` and `b`, returns `true`
 * if `a` is within the simplicity sequence of `b`,
 * or `a` equals `b`. `false` otherwise.
 */
export const isSimpler = (a: Conway0, b: Conway0) => {
	const ra = makeReader(signExpansionFromConway(a));
	const rb = makeReader(signExpansionFromConway(b));
	for (const _ of commonPrefix(ra, rb)) {
		// noop
	}
	return ra.lookahead() === null;
};

export const isStrictSimpler = (a: Conway0, b: Conway0) => {
	const ra = makeReader(signExpansionFromConway(a));
	const rb = makeReader(signExpansionFromConway(b));
	for (const _ of commonPrefix(ra, rb)) {
		// noop
	}
	return ra.lookahead() === null && rb.lookahead() !== null;
};

export interface SimplicitySeq<IsOrd extends boolean = boolean>
	extends Seq<Conway0<IsOrd>> {
	value: Conway0<IsOrd>;
}

/**
 * Given a surreal number, returns a transfinite sequence
 * of the simpler elements ending at a particular sign,
 * ordered by birthday.
 */
export const simplicitySeq = <IsOrd extends boolean = boolean>(
	a: Conway0<IsOrd>,
	sign: boolean,
): SimplicitySeq<IsOrd> => {
	const se: Entry[] = [...signExpansionFromConway(a)];
	const length = ensure(countSigns(makeReader(se), sign)) as Ord;
	return {
		value: a,
		isConstant: isZero(length) || isOne(length),
		length,
		index: (i: Ord): Conway0<IsOrd> => {
			assertLength(i, length);
			const iSign = findIndexToSign(makeReader(se), i, sign);
			if (iSign === null) {
				throw new Error("not possible");
			}
			return truncateConway(a, iSign) as Conway0<never>;
		},
	};
};

/**
 * Returns the left sequence of the surreal number.
 * The left sequence of a surreal number contains all surreal numbers
 * simpler and smaller than it.
 */
export const leftSeq = <IsOrd extends boolean = boolean>(x: Conway0<IsOrd>) =>
	simplicitySeq(x, true);

/**
 * Returns the right sequence of the surreal number.
 * The right sequence of a surreal number contains all surreal numbers
 * simpler and greater than it.
 */
export const rightSeq = <IsOrd extends boolean = boolean>(x: Conway0<IsOrd>) =>
	simplicitySeq(x, false);

export const appendSign = (
	x: Conway0,
	sign: boolean,
	length: Ord0,
): Conway0 => {
	if (isZero(length)) {
		return x;
	}
	return conwayFromSignExpansion(
		makeReader([...signExpansionFromConway(x), { sign, length }]),
	);
};

export const appendPlus = <IsOrd extends boolean = boolean>(
	x: Conway0<IsOrd>,
	length: Ord0,
): Conway0<IsOrd> => {
	return appendSign(x, true, length) as Conway0<never>;
};
export const appendMinus = (x: Conway0, length: Ord0): Conway0 => {
	return appendSign(x, false, length);
};

/**
 * Given two surreal numbers `a`, `b` and `a` < `b`, returns
 * the simplest surreal number `c` such that `a < c && c < b`.
 */
export const simplestBetween = (a: Conway0, b: Conway0): Conway0 => {
	if (!lt(a, b)) {
		throw new RangeError("simplestBetween: (a < b) must be true");
	}
	let ra = makeReader(signExpansionFromConway(a));
	let rb = makeReader(signExpansionFromConway(b));
	const sc = [...commonPrefix(ra, rb)];

	if (ra.lookahead() !== null && rb.lookahead() !== null) {
		// a < c < b
		return conwayFromSignExpansion(makeReader(sc));
	}

	let plus = true;
	let a0 = a;
	// Either c = a < b or a < b = c
	// The comments below will assume c = a, and the code within the if
	// will perform the swapping for the c = b case
	if (ra.lookahead() !== null) {
		[ra, rb] = [rb, ra];
		plus = false;
		a0 = b;
	}

	// b = a[+ ...]
	const res0 = rb.lookahead();
	if (res0 === null || res0.sign !== plus) {
		throw new Error("impossible");
	}

	const ap = appendSign(a0, plus, 1n);
	if (!isOne(res0.length)) {
		// b = a[+^(k > 1) ...]
		return ap;
	}
	rb.consume(1n);

	const minus = !plus;
	const res1 = rb.lookahead();
	if (res1 === null) {
		// b = a[+], res = a[+ -]
		return appendSign(ap, minus, 1n);
	}

	const l = res1.length;
	rb.consume(l);
	if (rb.lookahead() === null) {
		// b = a[+ -^k], res = a[+ -^k -]
		return appendSign(ap, minus, succ(res1.length));
	}
	// b = a[+ -^k + ...]
	return appendSign(ap, minus, res1.length);
};
