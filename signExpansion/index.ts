import { Conway, type Real } from "../conway";
import { unit, zero } from "../op";
import { neg, sub } from "../op/arith";
import { isNegative, isOne, isZero } from "../op/comparison";
import {
	concat,
	cycleArray,
	empty,
	fromArray,
	indexByPower,
	map,
	maybeSimplifyConst,
	maybeOverrideIsConstant,
	prod,
	type Seq,
} from "../seq";
import { signExpansionReal, type Sign } from "./real";

const concat1 = <T>(a: Seq<T>, b: Seq<T>) =>
	maybeSimplifyConst(a === empty ? b : b === empty ? a : concat(a, b));

const signExpansionLow = (power: Real | Conway, coeff: Real): Seq<Sign> => {
	const pos = coeff > 0;
	const neg = !pos;
	const sePower = signExpansion(power);
	// [+] & rep(w, SE(power)) & SE_Real(coeff, true)
	return concat1(
		concat1(
			fromArray<Sign>([pos]),
			maybeSimplifyConst(
				maybeOverrideIsConstant<Sign, Seq<Sign>>(
					map(prod(cycleArray([null], unit), sePower), ([_, v]) => neg === v),
					sePower.isConstant,
				),
			),
		),
		signExpansionReal(coeff < 0 ? -coeff : coeff, true),
	);
};

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
		if (isNegative(p)) {
			// infinitesimal
			const pPos = Conway.neg(p);
			const dp = sub(pPos, lastP);
			lastP = pPos;
			se = concat1(se, signExpansionLow(dp, c));
			continue;
		}

		// infinite
		const sePower = maybeSimplifyConst(indexByPower(signExpansion(p)));
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
