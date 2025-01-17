import fc from "fast-check";
import type { Conway, Ord, Ord0 } from "../conway";
import { Dyadic, dyadicWithSign, dyadicZero } from "../dyadic";
import { create, fromReal } from "../op";
import { isAboveReals } from "../op";
import { ordinalEnsure } from "../op/ordinal";
import { type Real, realToNumber } from "../real";
import type { Seq } from "../seq";
import { type Entry, groupBySign } from "../signExpansion/reader";
import { signExpansionDyadic } from "../signExpansion/real";

export const seqToArray = <T>(x: Seq<T>): T[] => {
	const n = x.length;
	if (isAboveReals(n)) {
		throw new RangeError(`toArray: must have finite length: ${n}`);
	}

	return Array(realToNumber((n as Conway).realPart))
		.fill(0)
		.map((_, i) => x.index(ordinalEnsure(i)));
};

export const arbFinite = fc.float({
	min: -1e3,
	max: 1e3,
	noNaN: true,
	noDefaultInfinity: true,
});

// export const arbFiniteBigint = fc.bigInt({ min: -128n, max: 128n });
// export const arbFiniteBigintOrd = fc.bigInt({ min: 0n, max: 128n });
export const arbFiniteBigint = fc.bigInt({ min: -8n, max: 8n });
export const arbFiniteBigintOrd = fc.bigInt({ min: 0n, max: 8n });

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
	maxLength: 6,
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
) => fc.array(fc.tuple(arbReal, arbReal), constraints).map(create);

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
		.map(create);

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
		.map(create);

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
		.map(create);

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
		.map(create);

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

export const arbEntry = (
	arbLength = arbOrd3 as fc.Arbitrary<Ord0>,
): fc.Arbitrary<Entry> =>
	fc.record<Entry>({
		sign: fc.boolean(),
		length: arbLength,
	});

export const arbSigns = fc.array(arbEntry(), { minLength: 0 });

export const arbGroupedSigns = fc
	.array(arbEntry(), { minLength: 1 })
	.map((x) => [...groupBySign(x)]);
