import fc from "fast-check";
import { Conway } from "../conway";
import { arbFinite, arbOrd3, arbConway3, arbFiniteBigint } from "./generators";

describe("birthday", () => {
	describe("birthday of real numbers", () => {
		it("bigint", () => {
			expect(Conway.birthday(0)).toBe(0);
			expect(Conway.birthday(0)).toBe(0);
			expect(Conway.birthday(1)).toBe(1);
			expect(Conway.birthday(-1)).toBe(1);
			expect(Conway.birthday(2)).toBe(2);
			expect(Conway.birthday(-2)).toBe(2);
			expect(Conway.birthday(123)).toBe(123);
		});

		it("bigint", () => {
			expect(Conway.birthday(0n)).toBe(0n);
			expect(Conway.birthday(1n)).toBe(1n);
			expect(Conway.birthday(-1n)).toBe(1n);
			expect(Conway.birthday(2n)).toBe(2n);
			expect(Conway.birthday(-2n)).toBe(2n);
			expect(Conway.birthday(123n)).toBe(123n);
		});

		it("fractions", () => {
			expect(Conway.birthday(0.5)).toBe(1);
			expect(Conway.birthday(-0.5)).toBe(1);
			expect(Conway.birthday(0.25)).toBe(2);
			expect(Conway.birthday(0.75)).toBe(2);
		});

		it("non-negative", () => {
			fc.assert(
				fc.property(
					arbFinite,
					(x) => !Conway.ensure(Conway.birthday(x)).isNegative,
				),
			);
		});

		it("negation symmetry", () => {
			fc.assert(
				fc.property(
					arbFinite,
					(x) => Conway.birthday(x) === Conway.birthday(-x),
				),
			);
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
					(x) => Conway.birthday(x / 2) === Conway.add(1, Conway.birthday(x)),
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
						Conway.birthday(s * (i + f)) ===
						Conway.add(Conway.birthday(s * i), Conway.birthday(s * f)),
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
						const pa = Conway.mono(1, -a);
						const pb = Conway.mono(1, -b);
						return Conway.eq(pb.birthday(), pa.add(pb).birthday());
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
						const pa = Conway.mono(1, Conway.mono(1, a).neg());
						const db = Conway.mono(1, -b);
						const pb = Conway.mono(1, Conway.mono(1, a).neg().add(-b));
						return Conway.eq(
							Conway.ordinalAdd(pa.birthday(), db.birthday()),
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
				fc.property(arbOrd3, (x) => Conway.eq(x.birthday(), x)),
				{ numRuns: 300 },
			);
		});

		it("birthdays are ordinal numbers", () => {
			fc.assert(
				fc.property(arbConway3(arbFiniteBigint), (x) =>
					Conway.isOrdinal(Conway.birthday(x)),
				),
				{ numRuns: 300 },
			);
		});

		it("birthday is not less than the number itself: b(x) >= x", () => {
			fc.assert(
				fc.property(arbConway3(arbFiniteBigint), (x) =>
					Conway.ge(Conway.birthday(x), x),
				),
				{ numRuns: 300 },
			);
		});

		it("static method is equivalent to instance method", () => {
			fc.assert(
				fc.property(arbConway3(arbFiniteBigint), (x) =>
					Conway.eq(Conway.birthday(x), x.birthday()),
				),
				{ numRuns: 300 },
			);
		});

		it("decompose and sum of birthdays", () => {
			fc.assert(
				fc.property(
					arbConway3(arbFiniteBigint),
					({ infinitePart: xp, realPart: x0, infinitesimalPart: xm }) =>
						Conway.eq(
							Conway.birthday(Conway.add(Conway.add(xp, x0), xm)),
							Conway.ordinalAdd(
								Conway.ordinalAdd(Conway.birthday(xp), Conway.birthday(x0)),
								Conway.birthday(xm),
							),
						),
				),
				{ numRuns: 300 },
			);
		});

		it("birthday is additive if the first number has no infinitesimal part", () => {
			fc.assert(
				fc.property(
					arbConway3(arbFiniteBigint),
					arbConway3(arbFiniteBigint),
					(a, b) => {
						fc.pre(
							a.length > 0 &&
								b.length > 0 &&
								Conway.isZero(a.infinitesimalPart),
						);
						const lp = b.leadingPower;
						fc.pre(lp === null || Conway.gt(a.getByIndex(a.length - 1)[0], lp));
						return Conway.eq(
							a.add(b).birthday(),
							Conway.ordinalAdd(a.birthday(), b.birthday()),
						);
					},
				),
				{ numRuns: 300 },
			);
		});

		it("birthday is increasing with respect to number of terms", () => {
			fc.assert(
				fc.property(arbConway3(arbFiniteBigint), (x) => {
					let partialSum = Conway.zero;
					const partialBirthdays = [];
					for (const [p, c] of x) {
						partialSum = partialSum.add(Conway.mono(c, p));
						partialBirthdays.push(partialSum.birthday());
					}

					if (partialBirthdays.length <= 1) {
						return true;
					}
					for (let i = 0; i < partialBirthdays.length - 1; i++) {
						if (Conway.gt(partialBirthdays[i], partialBirthdays[i + 1])) {
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
