import fc from "fast-check";
import { Conway } from "../conway";
import type { Real } from "../conway";

export const arbFinite = fc.float({
	min: -1e3,
	max: 1e3,
	noNaN: true,
	noDefaultInfinity: true,
});

export const arbFiniteBigint = fc.bigInt({ min: -1000n, max: 1000n });

export const arbRealGeneral = fc.oneof(
	arbFinite,
	arbFiniteBigint,
	fc.integer({ min: -1000, max: 1000 }),
);

export const defaultArrayConstraints: fc.ArrayConstraints = {
	minLength: 0,
	maxLength: 3,
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
): fc.Arbitrary<Conway> =>
	(arbReal ?? arbRealGeneral).map((r) => Conway.real(r));

export const arbOrd2 = arbConway2(arbFiniteBigint).filter((x) => x.isOrdinal);
export const arbOrd3 = arbConway3(arbFiniteBigint).filter((x) => x.isOrdinal);
