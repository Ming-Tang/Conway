import fc from "fast-check";
import { Conway, type Ord } from "../conway";
import type { Real } from "../real";
import { fromReal } from "../op";

export const arbFinite = fc.float({
	min: -1e3,
	max: 1e3,
	noNaN: true,
	noDefaultInfinity: true,
});

export const arbFiniteBigint = fc.bigInt({ min: -128n, max: 128n });
export const arbFiniteBigintOrd = fc.bigInt({ min: 0n, max: 128n });

export const arbDyadic = (maxBirthday = 16): fc.Arbitrary<Dyadic> =>
	fc
		.array(fc.boolean(), {
			minLength: 0,
			maxLength: maxBirthday,
		})
		.map(
			(xs) => xs.reduce(dyadicWithSign, dyadicZero),
			(x) => {
				if (x instanceof Dyadic) {
					return seqToArray(signExpansionDyadic(x));
				}
				throw new Error("unsupported");
			},
		);

export const arbRealGeneral: fc.Arbitrary<Real> = fc.oneof(
	arbFinite as fc.Arbitrary<Real>,
	arbFiniteBigint as fc.Arbitrary<Real>,
	fc.integer({ min: -128, max: 128 }) as fc.Arbitrary<Real>,
	arbDyadic(16) as fc.Arbitrary<Real>,
);

export const defaultArrayConstraints: fc.ArrayConstraints = {
	minLength: 0,
	maxLength: 4,
};

export const reduceConstraints = ({
	maxLength,
	...props
}: fc.ArrayConstraints): fc.ArrayConstraints => ({
	...props,
	maxLength:
		typeof maxLength === "number" && maxLength >= 1
			? Math.max(1, Math.ceil(maxLength / 2))
			: undefined,
});

export const arbConway1 = (
	arbReal = arbRealGeneral,
	constraints = defaultArrayConstraints,
) =>
	fc.array(fc.tuple(arbReal, arbReal), constraints).map((a) => new Conway(a));

export const arbConway2 = (
	arbReal = arbRealGeneral,
	constraints = defaultArrayConstraints,
) =>
	fc
		.array(
			fc.tuple(
				fc.oneof(arbReal, arbConway1(arbReal, reduceConstraints(constraints))),
				arbReal,
			),
			constraints,
		)
		.map((a) => new Conway(a));

export const arbConway3 = (
	arbReal = arbRealGeneral,
	constraints = defaultArrayConstraints,
) =>
	fc
		.array(
			fc.tuple(
				fc.oneof(arbReal, arbConway2(arbReal, reduceConstraints(constraints))),
				arbReal,
			),
			constraints,
		)
		.map((a) => new Conway(a));

export const arbConway4 = (
	arbReal = arbRealGeneral,
	constraints = defaultArrayConstraints,
) =>
	fc
		.array(
			fc.tuple(
				fc.oneof(arbReal, arbConway3(arbReal, reduceConstraints(constraints))),
				arbReal,
			),
			constraints,
		)
		.map((a) => new Conway(a));

export const arbConway5 = (
	arbReal = arbRealGeneral,
	constraints = defaultArrayConstraints,
) =>
	fc
		.array(
			fc.tuple(
				fc.oneof(arbReal, arbConway4(arbReal, reduceConstraints(constraints))),
				arbReal,
			),
			constraints,
		)
		.map((a) => new Conway(a));

export const arbConwayReal = (
	arbReal?: fc.Arbitrary<Real>,
): fc.Arbitrary<Conway> => (arbReal ?? arbRealGeneral).map((r) => fromReal(r));

export const arbOrd1 = arbConway1(arbFiniteBigintOrd).filter(
	(x) => x.isOrdinal,
) as fc.Arbitrary<Ord>;
export const arbOrd2 = arbConway2(arbFiniteBigintOrd).filter(
	(x) => x.isOrdinal,
) as fc.Arbitrary<Ord>;
export const arbOrd3 = arbConway3(arbFiniteBigintOrd).filter(
	(x) => x.isOrdinal,
) as fc.Arbitrary<Ord>;
