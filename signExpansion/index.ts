import { Conway, type Real } from "../conway";
import { ensure, unit, zero } from "../op";
import { neg } from "../op/arith";
import { gt, isNegative, isOne, isZero } from "../op/comparison";
import { ordinalRightSub } from "../op/ordinal";
import {
	concat,
	cycleArray,
	empty,
	fromArray,
	indexByPower,
	map,
	maybeSimplifyConst,
	prod,
	type Seq,
} from "../seq";
import { signExpansionReal, type Sign } from "./real";

const concat1 = <T>(a: Seq<T>, b: Seq<T>) =>
	maybeSimplifyConst(a === empty ? b : concat(a, b));

export const signExpansion = (
	value: Real | Conway,
	real = signExpansionReal,
): Seq<Sign> => {
	if (isZero(value)) {
		return empty as Seq<Sign>;
	}

	if (!(value instanceof Conway)) {
		return real(value);
	}

	let se = empty as Seq<Sign>;
	let lastP: Real | Conway = zero;
	for (const [p, c] of value) {
		if (isZero(p)) {
			// real
			se = concat1(se, real(c));
			continue;
		}
		let seMono: Seq<Sign> = empty as Seq<Sign>;
		const sePower = maybeSimplifyConst(indexByPower(signExpansion(p)));
		if (isNegative(p)) {
			// infinitesimal
			const p1 = sePower.length;
			// const dp = gt(lastP, p1) ? zero : ordinalRightSub(lastP, p1);
			const [pos, neg] = c > 0 ? [true, false] : [false, true];
			// [+] & (-)^SE(p) & SE(c, true)
			seMono = concat1(
				concat1(
					fromArray([pos]),
					// TODO invalid
					cycleArray([neg], p1),
					// maybeSimplifyConst(map(
					// 	prod(cycleArray([neg], unit), isZero(dp) ? sePower : leftTrunc(ensure(dp), sePower)),
					// 	([_, b]) => neg === b,
					// ))
				),
				signExpansionReal(c, true),
			);
			lastP = p1;
			se = concat1(se, seMono);
			continue;
		}
		if (isOne(c)) {
			seMono = sePower;
		} else if (isOne(neg(c))) {
			seMono = map(sePower, (x) => !x);
		} else {
			seMono = map(prod(sePower, real(c)), ([cr, cp]) => cr === cp);
		}
		se = concat1(se, seMono);
	}

	return se;
};
