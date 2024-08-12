import { Conway, type Real } from "../conway";
import { neg } from "../op/arith";
import { isNegative, isZero } from "../op/comparison";
import {
	concat,
	empty,
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
	if (Conway.isZero(value)) {
		return empty as Seq<Sign>;
	}

	if (!(value instanceof Conway)) {
		return real(value);
	}

	let se = empty as Seq<Sign>;
	for (const [p, c] of value) {
		if (isZero(p)) {
			// real
			se = concat1(se, real(c));
			continue;
		}
		if (isNegative(p)) {
			throw new Error("TODO support this");
			continue;
		}
		const sePower = maybeSimplifyConst(indexByPower(signExpansion(p)));
		let seMono: Seq<Sign> = empty as Seq<Sign>;
		if (Conway.isOne(c)) {
			seMono = sePower;
		} else if (Conway.isOne(neg(c))) {
			seMono = map(sePower, (x) => !x);
		} else {
			seMono = map(prod(sePower, real(c)), ([cr, cp]) => cr === cp);
		}
		se = concat1(se, seMono);
	}

	return se;
};
