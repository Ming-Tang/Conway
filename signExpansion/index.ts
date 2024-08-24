import { Conway } from "../conway";
import { ordinalUnit as unit, ordinalZero as zero } from "../op/ordinal";
import { neg, sub } from "../op/arith";
import { isNegative, isOne, isZero } from "../op/comparison";
import { realAbs, realIsPositive, type Real } from "../real";
import {
	concat,
	empty,
	fromArray,
	indexByPower,
	map,
	maybeSimplifyConst,
	maybeOverrideIsConstant,
	prod,
	type Seq,
	repeatEach,
	isEmpty,
} from "../seq";
import { signExpansionReal, type Sign } from "./real";

const concat1 = <T>(a: Seq<T>, b: Seq<T>): Seq<T> => {
	if (isEmpty(a)) {
		return isEmpty(b) ? (empty as Seq<T>) : b;
	}
	return maybeSimplifyConst(concat(a, b));
};

const flipSign = (x: Sign): Sign => !x;

const signExpansionLow = (power: Real | Conway, coeff: Real): Seq<Sign> => {
	const pos = realIsPositive(coeff);
	const sePower = signExpansion(power);
	const rep = repeatEach(sePower, unit);
	const seCoeff = signExpansionReal(realAbs(coeff), true);
	// [+] & rep(w, SE(power)) & SE_Real(coeff, true)
	return concat1(
		concat1(
			fromArray<Sign>([pos]),
			maybeSimplifyConst(
				maybeOverrideIsConstant<Sign, Seq<Sign>>(
					pos ? map(rep, flipSign) : rep,
					sePower.isConstant,
				),
			),
		),
		pos ? seCoeff : map(seCoeff, flipSign),
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
			const pPos = neg(p);
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
