import fc from "fast-check";
import {
	realCompare,
	realEq,
	realEqHash,
	realGe,
	realGt,
	realIsZero,
	realLe,
	realLt,
	realNe,
	realToString,
	type Real,
} from "../real";
import { arbRealGeneral } from "./generators";
import { propTotalOrder } from "./propsTest";
import {
	Dyadic,
	dyadicFromBigint,
	dyadicFromNumber,
	dyadicOne,
	dyadicZero,
} from "../dyadic";

const arbReal = arbRealGeneral;
const arbZero = fc.constantFrom(dyadicZero, 0n, +0, -0, 0);
const arbOne = fc.constantFrom(dyadicOne, 1n, +1, +1.0);

const arbEqRealPair = fc.oneof(
	arbReal.map((x) => [x, x] as [Real, Real]),
	fc.tuple(arbZero, arbZero),
	fc.tuple(arbOne, arbOne),
	fc.integer().map((n) => [n, BigInt(n)] as [Real, Real]),
	fc.bigInt().map((n) => [n, dyadicFromBigint(n)] as [Real, Real]),
	fc
		.float({ noNaN: true, noInteger: false, min: -1e7, max: 1e7 })
		.filter((x) => Number.isFinite(x) && +dyadicFromNumber(x) === x)
		.map((x) => [x, dyadicFromNumber(x)] as [Real, Real]),
);

describe("real ordering", () => {
	describe("total order", () => {
		propTotalOrder(it, arbReal, realCompare, realEq);
	});

	it("zeros being equal to each other through compare", () => {
		fc.assert(fc.property(arbZero, arbZero, (a, b) => realCompare(a, b) === 0));
	});

	it("isZero for zeros", () => {
		fc.assert(fc.property(arbZero, realIsZero));
	});

	it("!isZero for ones", () => {
		fc.assert(fc.property(arbOne, (x) => !realIsZero(x)));
	});

	it("eq(z1, z2) for zeros z1, z2", () => {
		fc.assert(fc.property(arbZero, arbZero, (a, b) => realEq(a, b)));
	});

	it("!ne(z1, z2) for zeros z1, z2", () => {
		fc.assert(fc.property(arbZero, arbZero, (a, b) => !realNe(a, b)));
	});

	it("compare(z1, z2) === 0 for zeros z1, z2", () => {
		fc.assert(fc.property(arbZero, arbZero, (a, b) => realCompare(a, b) === 0));
	});

	it("zeros not being equal to ones", () => {
		fc.assert(fc.property(arbZero, arbOne, (a, b) => realNe(a, b)));
	});

	it("eq(a, b) === (compare(a, b) === 0)", () => {
		fc.assert(
			fc.property(
				arbReal,
				arbReal,
				(a, b) => realEq(a, b) === (realCompare(a, b) === 0),
			),
		);
	});

	it("ne(a, b) === (compare(a, b) !== 0)", () => {
		fc.assert(
			fc.property(
				arbReal,
				arbReal,
				(a, b) => realNe(a, b) === (realCompare(a, b) !== 0),
			),
		);
	});

	it("eq(a, b) === !ne(a, b)", () => {
		fc.assert(
			fc.property(arbReal, arbReal, (a, b) => realEq(a, b) === !realNe(a, b)),
		);
	});

	it("eq(a, b) implies ge(a, b)", () => {
		fc.assert(
			fc.property(arbReal, arbReal, (a, b) => !realEq(a, b) || realGe(a, b)),
		);
	});

	it("eq(a, b) implies le(a, b)", () => {
		fc.assert(
			fc.property(arbReal, arbReal, (a, b) => !realEq(a, b) || realLe(a, b)),
		);
	});

	it("lt(a, b) !== ge(a, b)", () => {
		fc.assert(
			fc.property(arbReal, arbReal, (a, b) => realLt(a, b) !== realGe(a, b)),
		);
	});

	it("gt(a, b) !== le(a, b)", () => {
		fc.assert(
			fc.property(arbReal, arbReal, (a, b) => realGt(a, b) !== realLe(a, b)),
		);
	});
});

describe("arbEqRealPair", () => {
	it("both values are equal", () => {
		fc.assert(fc.property(arbEqRealPair, ([a, b]) => realEq(a, b)));
	});

	it("both values have same toString", () => {
		fc.assert(
			fc.property(
				arbEqRealPair,
				([a, b]) => realToString(a) === realToString(b),
			),
		);
	});
});

describe("realToString", () => {
	it("dyadic vs bigint", () => {
		expect(realToString(1n)).toBe(realToString(Dyadic.ONE));
		expect(realToString(-1n)).toBe(realToString(Dyadic.NEG_ONE));
		expect(realToString(-1.0)).toBe(realToString(Dyadic.NEG_ONE));
	});
});

describe("realEqHash", () => {
	it("equal value implies same eqHash", () => {
		fc.assert(
			fc.property(
				arbReal,
				arbReal,
				(a, b) => !realEq(a, b) || realEqHash(a) === realEqHash(b),
			),
		);
	});

	it("different eqHash implies not equals", () => {
		fc.assert(
			fc.property(arbReal, arbReal, (a, b) => {
				fc.pre(realEqHash(a) !== realEqHash(b));
				return realNe(a, b);
			}),
		);
	});

	it("equal toString implies same eqHash", () => {
		fc.assert(
			fc.property(
				arbReal,
				arbReal,
				(a, b) =>
					realToString(a) !== realToString(b) ||
					realEqHash(a) === realEqHash(b),
			),
		);
	});

	it("realEqHash(number) = realEqHash(bigint) of same value", () => {
		fc.assert(
			fc.property(fc.integer(), (n) => realEqHash(n) === realEqHash(BigInt(n))),
		);
	});

	it("arbEqRealPair have same hash", () => {
		fc.assert(
			fc.property(arbEqRealPair, ([a, b]) => realEqHash(a) === realEqHash(b)),
		);
	});
});
