import fc from "fast-check";
import { birthday, ensure, realBirthday } from "../op";
import { concat, fromArray } from "../seq";
import { minusReal, plusReal, signExpansionReal } from "./real";
import { assertEq } from "../test/propsTest";
import { sub } from "../op/arith";
import { succ } from "../op/ordinal";
import { arbRealGeneral } from "../test/generators";
import { realEq, realGt, realLt, realNeg } from "../real";
import { seqToArray as toArray } from "../test/generators";

fc.configureGlobal({ numRuns: 1000, verbose: false });

const arbReal = arbRealGeneral;

describe("signExpansionReal", () => {
	it("constants", () => {
		expect(toArray(signExpansionReal(0))).toEqual([]);
		expect(toArray(signExpansionReal(1))).toEqual([true]);
		expect(toArray(signExpansionReal(-1))).toEqual([false]);
		expect(toArray(signExpansionReal(0.5))).toEqual([true, false]);
		expect(toArray(signExpansionReal(0.75))).toEqual([true, false, true]);
		expect(toArray(signExpansionReal(-0.5))).toEqual([false, true]);
		expect(toArray(signExpansionReal(-0.75))).toEqual([false, true, false]);
		expect(toArray(signExpansionReal(2))).toEqual([true, true]);
		expect(toArray(signExpansionReal(-2))).toEqual([false, false]);
		expect(toArray(signExpansionReal(3))).toEqual([true, true, true]);
		expect(toArray(signExpansionReal(-3))).toEqual([false, false, false]);
	});

	it("length equals surreal birthday for integers", () => {
		fc.assert(
			fc.property(fc.integer(), (x) =>
				assertEq(signExpansionReal(x).length, birthday(x)),
			),
		);
	});

	it("length equals surreal birthday for fractions (n/2^16)", () => {
		fc.assert(
			fc.property(arbReal, (x) =>
				assertEq(signExpansionReal(x).length, birthday(x)),
			),
		);
	});

	it("length is within 1 as surreal birthday for fractions", () => {
		fc.assert(
			fc.property(arbReal, (x) => {
				const diff = ensure(sub(signExpansionReal(x).length, realBirthday(x)));
				return Math.abs(Number(diff.realPart)) < 2;
			}),
		);
	});

	it("negation symmetry", () => {
		fc.assert(
			fc.property(arbReal, (x) => {
				const s1 = toArray(signExpansionReal(x));
				const s2 = toArray(signExpansionReal(-x));
				expect(s1.map((s) => !s)).toEqual(s2);
			}),
		);
	});
});

describe("plus/minus", () => {
	it("constants (plus)", () => {
		expect(plusReal(1)).toBe(2);
		expect(plusReal(2)).toBe(3);
		expect(plusReal(-1)).toBe(-0.5);
		expect(plusReal(-0.5)).toBe(-0.25);
		expect(plusReal(0.75)).toBe((1 + 0.75) / 2);
	});

	it("constants (minus)", () => {
		expect(minusReal(-1)).toBe(-2);
		expect(minusReal(-2)).toBe(-3);
		expect(minusReal(1)).toBe(0.5);
		expect(minusReal(0.5)).toBe(0.25);
		expect(minusReal(0.75)).toBe((0.5 + 0.75) / 2);
	});

	it("|signExpansion(plus(n))| = |signExpansion(n)| + 1", () => {
		fc.assert(
			fc.property(arbReal, (n) =>
				assertEq(
					signExpansionReal(plusReal(n)).length,
					succ(signExpansionReal(n).length),
				),
			),
		);
	});

	it("|signExpansion(minus(n))| = |signExpansion(n)| + 1", () => {
		fc.assert(
			fc.property(arbReal, (n) =>
				assertEq(
					signExpansionReal(minusReal(n)).length,
					succ(signExpansionReal(n).length),
				),
			),
		);
	});

	it("signExpansion(plus(n)) = signExpansion(n) & (+)", () => {
		fc.assert(
			fc.property(arbReal, (n) => {
				// console.log({ n, n1: plusReal(n)});
				// console.log({ n: toArray(signExpansionReal(n)), n1: toArray(signExpansionReal(plusReal(n))) });
				return expect(toArray(signExpansionReal(plusReal(n)))).toEqual(
					toArray(concat(signExpansionReal(n), fromArray([true]))),
				);
			}),
		);
	});

	it("signExpansion(minus(n)) = signExpansion(n) & (-)", () => {
		fc.assert(
			fc.property(arbReal, (n) =>
				expect(toArray(signExpansionReal(minusReal(n)))).toEqual(
					toArray(concat(signExpansionReal(n), fromArray([false]))),
				),
			),
		);
	});

	it("plus(n) = n + 1 for integer n >= 0", () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 0, max: 1000 }),
				(n) => plusReal(n) === n + 1,
			),
		);
	});

	it("minus(n) = n - 1 for integer n <= 0", () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 0, max: 1000 }).map((n) => -n),
				(n) => minusReal(n) === n - 1,
			),
		);
	});

	it("plus(n) = -minus(-n)", () => {
		fc.assert(
			fc.property(
				fc.float({ noInteger: false, noNaN: true, noDefaultInfinity: true }),
				(n) => realEq(plusReal(n), realNeg(minusReal(-n))),
			),
		);
	});

	it("plus(n) > n", () => {
		fc.assert(fc.property(arbReal, (n) => realGt(plusReal(n), n)));
	});

	it("minus(n) < n", () => {
		fc.assert(fc.property(arbReal, (n) => realLt(minusReal(n), n)));
	});
});
