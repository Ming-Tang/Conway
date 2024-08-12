import fc from "fast-check";
import { birthday, ensure } from "../op";
import { isAboveReals } from "../op/comparison";
import { concat, fromArray, type Seq } from "../seq";
import { minusNumber, plusNumber, signExpansionNumber } from "./real";
import { assertEq } from "../test/propsTest";
import { Conway } from "../conway";
import { sub } from "../op/arith";
import { succ } from "../op/ordinal";
import { arbDyadic } from "../test/generators";

const toArray = <T>(x: Seq<T>): T[] => {
	const n = x.length;
	if (isAboveReals(n)) {
		throw new RangeError(`toArray: must have finite length: ${n}`);
	}

	return Array(n.realPart)
		.fill(0)
		.map((_, i) => x.index(ensure(i)));
};

const arbNum = fc.float({ noNaN: true, noDefaultInfinity: true });
const arbNum16 = arbDyadic(16);

describe("signExpansionNumber", () => {
	it("constants", () => {
		expect(toArray(signExpansionNumber(0))).toEqual([]);
		expect(toArray(signExpansionNumber(1))).toEqual([true]);
		expect(toArray(signExpansionNumber(-1))).toEqual([false]);
		expect(toArray(signExpansionNumber(0.5))).toEqual([true, false]);
		expect(toArray(signExpansionNumber(0.75))).toEqual([true, false, true]);
		expect(toArray(signExpansionNumber(-0.5))).toEqual([false, true]);
		expect(toArray(signExpansionNumber(-0.75))).toEqual([false, true, false]);
	});

	it("length equals surreal birthday for integers", () => {
		fc.assert(
			fc.property(fc.integer(), (x) =>
				assertEq(signExpansionNumber(x).length, birthday(x)),
			),
		);
	});

	it("length equals surreal birthday for fractions (n/2^16)", () => {
		fc.assert(
			fc.property(arbNum16, (x) =>
				assertEq(signExpansionNumber(x).length, birthday(x)),
			),
		);
	});

	it("length is within 1 as surreal birthday for fractions", () => {
		fc.assert(
			fc.property(arbNum, (x) => {
				const diff = ensure(
					sub(signExpansionNumber(x).length, Conway.realBirthday(x)),
				);
				return Math.abs(Number(diff.realPart)) < 2;
			}),
		);
	});

	it("negation symmetry", () => {
		fc.assert(
			fc.property(arbNum16, (x) => {
				const s1 = toArray(signExpansionNumber(x));
				const s2 = toArray(signExpansionNumber(-x));
				expect(s1.map((s) => !s)).toEqual(s2);
			}),
		);
	});
});

describe("plus/minus", () => {
	it("constants (plus)", () => {
		expect(plusNumber(1)).toBe(2);
		expect(plusNumber(-1)).toBe(-0.5);
		expect(plusNumber(-0.5)).toBe(-0.25);
		expect(plusNumber(0.75)).toBe((1 + 0.75) / 2);
	});

	it("constants (minus)", () => {
		expect(minusNumber(-1)).toBe(-2);
		expect(minusNumber(1)).toBe(0.5);
		expect(minusNumber(0.5)).toBe(0.25);
		expect(minusNumber(0.75)).toBe((0.5 + 0.75) / 2);
	});

	it("|signExpansion(plus(n))| = |signExpansion(n)| + 1", () => {
		fc.assert(
			fc.property(arbNum16, (n) =>
				assertEq(
					signExpansionNumber(plusNumber(n)).length,
					succ(signExpansionNumber(n).length),
				),
			),
		);
	});

	it("|signExpansion(minus(n))| = |signExpansion(n)| + 1", () => {
		fc.assert(
			fc.property(arbNum16, (n) =>
				assertEq(
					signExpansionNumber(minusNumber(n)).length,
					succ(signExpansionNumber(n).length),
				),
			),
		);
	});

	it("signExpansion(plus(n)) = signExpansion(n) & (+)", () => {
		fc.assert(
			fc.property(arbNum16, (n) =>
				expect(toArray(signExpansionNumber(plusNumber(n)))).toEqual(
					toArray(concat(signExpansionNumber(n), fromArray([true]))),
				),
			),
		);
	});

	it("signExpansion(minus(n)) = signExpansion(n) & (-)", () => {
		fc.assert(
			fc.property(arbNum16, (n) =>
				expect(toArray(signExpansionNumber(minusNumber(n)))).toEqual(
					toArray(concat(signExpansionNumber(n), fromArray([false]))),
				),
			),
		);
	});

	it("plus(n) = n + 1 for integer n >= 0", () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 0, max: 1000 }),
				(n) => plusNumber(n) === n + 1,
			),
		);
	});

	it("minus(n) = n - 1 for integer n <= 0", () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 0, max: 1000 }).map((n) => -n),
				(n) => minusNumber(n) === n - 1,
			),
		);
	});

	it("plus(n) = -minus(-n)", () => {
		fc.assert(
			fc.property(
				fc.float({ noInteger: false, noNaN: true, noDefaultInfinity: true }),
				(n) => expect(plusNumber(n)).toBe(-minusNumber(-n)),
			),
		);
	});

	it("plus(n) > n", () => {
		fc.assert(
			fc.property(arbNum16, (n) => expect(plusNumber(n)).toBeGreaterThan(n)),
		);
	});

	it("minus(n) < n", () => {
		fc.assert(
			fc.property(arbNum16, (n) => expect(minusNumber(n)).toBeLessThan(n)),
		);
	});
});
