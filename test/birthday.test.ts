import fc from "fast-check";
import { arbFinite, arbOrd3, arbConway3, arbFiniteBigint } from "./generators";
import { birthday, ensure, mono, mono1, zero } from "../op";
import { eq, ge, gt } from "../op/comparison";
import { isOrdinal, ordinalAdd } from "../op/ordinal";
import { add } from "../op/arith";
import {} from "../signExpansion/birthday";
import type { Conway } from "../conway";

describe("birthday", () => {
	describe("birthday of real numbers", () => {
		it("number", () => {
			expect(birthday(0)).toBe(0n);
			expect(birthday(1)).toBe(1n);
			expect(birthday(-1)).toBe(1n);
			expect(birthday(2)).toBe(2n);
			expect(birthday(-2)).toBe(2n);
			expect(birthday(123)).toBe(123n);
		});

		it("bigint", () => {
			expect(birthday(0n)).toBe(0n);
			expect(birthday(1n)).toBe(1n);
			expect(birthday(-1n)).toBe(1n);
			expect(birthday(2n)).toBe(2n);
			expect(birthday(-2n)).toBe(2n);
			expect(birthday(123n)).toBe(123n);
		});

		it("fractions", () => {
			expect(birthday(0.5)).toBe(2n);
			expect(birthday(-0.5)).toBe(2n);
			expect(birthday(0.25)).toBe(3n);
			expect(birthday(0.75)).toBe(3n);
		});

		it("non-negative", () => {
			fc.assert(fc.property(arbFinite, (x) => !ensure(birthday(x)).isNegative));
		});

		it("negation symmetry", () => {
			fc.assert(fc.property(arbFinite, (x) => birthday(x) === birthday(-x)));
		});

		it("halfing fraction", () => {
			fc.assert(
				fc.property(
					fc.float({
						min: 2 ** -8,
						max: 1 - 2 ** -8,
						noInteger: true,
						noNaN: true,
						noDefaultInfinity: true,
					}),
					(x) => birthday(x / 2) === add(1n, birthday(x)),
				),
			);
		});

		it("integer plus fraction", () => {
			fc.assert(
				fc.property(
					fc.boolean().map((b) => (b ? 1 : -1)),
					fc.integer({ min: 0, max: 100 }),
					fc.float({
						min: 2 ** -8,
						max: 1 - 2 ** -8,
						noInteger: true,
						noNaN: true,
						noDefaultInfinity: true,
					}),
					(s, i, f) =>
						birthday(s * (i + f)) === add(birthday(s * i), birthday(s * f)),
				),
			);
		});
	});

	describe("birthdays of pure infinitesimals", () => {
		it("b(w^-a + w^-b) = b(w^-b) for b > a and a, b being natural numbers", () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 1, max: 100 }),
					fc.integer({ min: 1, max: 100 }),
					(a, b) => {
						fc.pre(b > a);
						const pa = mono1(-a);
						const pb = mono1(-b);
						return eq(pb.birthday(), pa.add(pb).birthday());
					},
				),
				{ numRuns: 300 },
			);
		});

		it("smaller but lower birthday", () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 1, max: 100 }),
					fc.integer({ min: 1, max: 100 }),
					(a, b) => {
						const pa = mono1(mono1(a).neg());
						const db = mono1(-b);
						const pb = mono1(mono1(a).neg().add(-b));
						return eq(
							ordinalAdd(pa.birthday(), db.birthday()),
							pa.add(pb).birthday(),
						);
					},
				),
				{ numRuns: 300 },
			);
		});
	});

	describe("birthday of surreal numbers in general", () => {
		it("ordinal numbers have themselves as birthdays", () => {
			fc.assert(
				fc.property(arbOrd3, (x) => eq(x.birthday(), x)),
				{ numRuns: 300 },
			);
		});

		it("birthdays are ordinal numbers", () => {
			fc.assert(
				fc.property(arbConway3(arbFiniteBigint), (x) => isOrdinal(birthday(x))),
				{ numRuns: 300 },
			);
		});

		it("birthday is not less than the number itself: b(x) >= x", () => {
			fc.assert(
				fc.property(arbConway3(arbFiniteBigint), (x) => ge(birthday(x), x)),
				{ numRuns: 300 },
			);
		});

		it("static method is equivalent to instance method", () => {
			fc.assert(
				fc.property(arbConway3(arbFiniteBigint), (x) =>
					eq(birthday(x), x.birthday()),
				),
				{ numRuns: 300 },
			);
		});

		it("decompose and sum of birthdays", () => {
			fc.assert(
				fc.property(
					arbConway3(arbFiniteBigint),
					({ infinitePart: xp, realPart: x0, infinitesimalPart: xm }) =>
						eq(
							birthday(add(add(xp, x0), xm)),
							ordinalAdd(ordinalAdd(birthday(xp), birthday(x0)), birthday(xm)),
						),
				),
				{ numRuns: 300 },
			);
		});

		it("birthday is increasing with respect to the number of terms", () => {
			fc.assert(
				fc.property(arbConway3(arbFiniteBigint), (x) => {
					let partialSum: Conway = zero;
					const partialBirthdays = [];
					for (const [p, c] of x) {
						partialSum = partialSum.add(mono(c, p));
						partialBirthdays.push(partialSum.birthday());
					}

					if (partialBirthdays.length <= 1) {
						return true;
					}
					for (let i = 0; i < partialBirthdays.length - 1; i++) {
						if (gt(partialBirthdays[i], partialBirthdays[i + 1])) {
							return false;
						}
					}
					return true;
				}),
				{ numRuns: 300 },
			);
		});
	});
});
