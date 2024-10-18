import fc from "fast-check";
import {
	realCompare,
	realEq,
	realGe,
	realGt,
	realIsZero,
	realLe,
	realLt,
	realNe,
	realToString,
} from "../real";
import { arbRealGeneral } from "./generators";
import { propTotalOrder } from "./propsTest";
import { Dyadic, dyadicOne, dyadicZero } from "../dyadic";

const arbReal = arbRealGeneral;
const arbZero = fc.constantFrom(dyadicZero, 0n, +0, -0, 0);
const arbOne = fc.constantFrom(dyadicOne, 1n, +1, +1.0);

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

describe("realToString", () => {
	it("dyadic vs bigint", () => {
		expect(realToString(1n)).toBe(realToString(Dyadic.ONE));
		expect(realToString(-1n)).toBe(realToString(Dyadic.NEG_ONE));
		expect(realToString(-1.0)).toBe(realToString(Dyadic.NEG_ONE));
	});
});
