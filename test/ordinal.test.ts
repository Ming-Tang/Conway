import fc from "fast-check";
import { Conway, type Real } from "../conway";
import { arbConway3, arbFiniteBigint, arbOrd3 } from "./generators";
import { isOrdinal, ordinalAdd, ordinalMult } from "../op/ordinal";
import { one, unit, zero } from "../op";
import { isPositive } from "../op/comparison";
import { assertEq } from "./propsTest";

fc.configureGlobal({ numRuns: 20000, verbose: false });

describe("ordinals", () => {
	describe("ordinalAdd", () => {
		it("constants", () => {
			expect(Conway.zero.ordinalAdd(Conway.unit).eq(Conway.unit));
			expect(
				Conway.unit
					.ordinalAdd(Conway.one)
					.eq(Conway.unit.ordinalAdd(Conway.one)),
			);
			expect(Conway.one.ordinalAdd(Conway.unit).eq(Conway.unit));
		});

		it("any ordinal ordinalAdd zero", () => {
			fc.assert(fc.property(arbOrd3, (a) => a.ordinalAdd(Conway.zero).eq(a)));
		});
		it("zero ordinalAdd any ordinal", () => {
			fc.assert(fc.property(arbOrd3, (a) => Conway.zero.ordinalAdd(a).eq(a)));
		});

		it("ordinalAdd result is ordinal", () => {
			fc.assert(
				fc.property(arbOrd3, arbOrd3, (a, b) => a.ordinalAdd(b).isOrdinal),
			);
		});

		it("increasing", () => {
			fc.assert(
				fc.property(arbOrd3, arbOrd3, (a, b) => Conway.ge(a.ordinalAdd(b), a)),
			);
		});

		it("strictly increasing (<) on right argument", () => {
			fc.assert(
				fc.property(arbOrd3, arbOrd3, arbOrd3, (a, b, c) => {
					fc.pre(Conway.lt(a, b));
					return Conway.lt(c.ordinalAdd(a), c.ordinalAdd(b));
				}),
			);
		});

		it("increasing (<=) on right argument", () => {
			fc.assert(
				fc.property(arbOrd3, arbOrd3, arbOrd3, (a, b, c) => {
					fc.pre(Conway.lt(a, b));
					return Conway.le(a.ordinalAdd(c), b.ordinalAdd(c));
				}),
			);
		});

		it("static method is equivalent to instance method", () => {
			fc.assert(
				fc.property(arbOrd3, arbOrd3, (a, b) =>
					Conway.eq(a.ordinalAdd(b), Conway.ordinalAdd(a, b)),
				),
			);
		});
	});

	describe("ordinalRightSub", () => {
		it("constants", () => {
			expect(
				Conway.eq(
					Conway.ordinalRightSub(Conway.zero, Conway.zero),
					Conway.zero,
				),
			).toBe(true);
			expect(
				Conway.eq(Conway.ordinalRightSub(Conway.zero, Conway.one), Conway.one),
			).toBe(true);
			expect(
				Conway.eq(Conway.ordinalRightSub(Conway.one, Conway.one), Conway.zero),
			).toBe(true);
			expect(
				Conway.eq(Conway.ordinalRightSub(Conway.one, Conway.unit), Conway.unit),
			).toBe(true);
			expect(
				Conway.eq(
					Conway.ordinalRightSub(Conway.one, Conway.unit.add(Conway.one)),
					Conway.unit.add(Conway.one),
				),
			).toBe(true);
			expect(
				Conway.eq(
					Conway.ordinalRightSub(Conway.unit, Conway.unit),
					Conway.zero,
				),
			).toBe(true);
		});

		it("ordinalRightSub equal value", () => {
			fc.assert(
				fc.property(
					arbConway3(arbFiniteBigint).filter((x) => x.isOrdinal),
					(a) => a.ordinalRightSub(a).isZero,
				),
			);
		});

		it("ordinalRightSub result is ordinal", () => {
			fc.assert(
				fc.property(
					arbConway3(arbFiniteBigint).filter((x) => x.isOrdinal),
					arbConway3(arbFiniteBigint).filter((x) => x.isOrdinal),
					(a, b) => {
						fc.pre(Conway.ge(b, a));
						return a.ordinalRightSub(b).isOrdinal;
					},
				),
			);
		});

		it("ordinalRightSub result can be added back (with self)", () => {
			fc.assert(
				fc.property(
					arbConway3(arbFiniteBigint).filter((x) => x.isOrdinal),
					(a) => {
						const c = a.ordinalRightSub(a);
						return a.ordinalAdd(c).eq(a);
					},
				),
			);
		});

		it("ordinalRightSub result can be added back", () => {
			fc.assert(
				fc.property(
					arbConway3(arbFiniteBigint).filter((x) => x.isOrdinal),
					arbConway3(arbFiniteBigint).filter((x) => x.isOrdinal),
					(a, b) => {
						fc.pre(Conway.gt(b, a));
						const c = a.ordinalRightSub(b);
						return a.ordinalAdd(c).eq(b);
					},
				),
			);
		});

		it("static method is equivalent to instance method", () => {
			fc.assert(
				fc.property(arbOrd3, arbOrd3, (a, b) => {
					fc.pre(Conway.ge(b, a));
					return Conway.eq(a.ordinalRightSub(b), Conway.ordinalRightSub(a, b));
				}),
			);
		});
	});

	describe("ordinalMult", () => {
		it("constants", () => {
			assertEq(ordinalMult(one, one), one);
			assertEq(ordinalMult(one, unit), unit);
			assertEq(ordinalMult(unit, unit), unit.mult(unit));
		});

		it("constants (absorbing)", () => {
			assertEq(ordinalMult(2n, unit), unit);
			assertEq(ordinalMult(3n, unit.add(1n)), unit.add(3n));
			assertEq(ordinalMult(unit.add(3n), 5n), unit.mult(5n).add(3n));
		});

		it("constants (assoc)", () => {
			assertEq(ordinalMult(unit, 2n), unit.mult(2n));
			assertEq(ordinalMult(ordinalMult(unit, 2n), unit), unit.mult(unit));
			assertEq(ordinalMult(unit, ordinalMult(2n, unit)), unit.mult(unit));
			// w.(2.(w + 1)) = w.(w + 2) = w^2 + w.2
			assertEq(
				ordinalMult(unit, ordinalMult(2n, unit.add(1n))),
				unit.mult(unit).add(unit.mult(2n)),
			);
			// (w.2).(w + 1) = (w.2).w + (w.2).1 = w^2 + w.2
			assertEq(
				unit.mult(2n).ordinalMult(unit.add(1n)),
				unit.mult(unit).add(unit.mult(2n)),
			);
		});

		it("constants (distr)", () => {
			// (w + 1)(w + 1) = (w+1).w + (w+1).1
			// = w^2 + w + 1
			assertEq(
				unit.add(1n).ordinalMult(unit.add(1n)),
				unit.mult(unit).add(unit).add(1n),
			);
		});

		it("left zero", () => {
			fc.assert(
				fc.property(arbOrd3, (a) => assertEq(ordinalMult(zero, a), zero)),
			);
		});

		it("right zero", () => {
			fc.assert(
				fc.property(arbOrd3, (a) => assertEq(ordinalMult(a, zero), zero)),
			);
		});

		it("left identity", () => {
			fc.assert(fc.property(arbOrd3, (a) => assertEq(ordinalMult(one, a), a)));
		});

		it("right identity", () => {
			fc.assert(fc.property(arbOrd3, (a) => assertEq(ordinalMult(a, one), a)));
		});

		it("result must be ordinal", () => {
			fc.assert(
				fc.property(
					arbOrd3.filter(isPositive),
					arbOrd3.filter(isPositive),
					(a, b) => isOrdinal(ordinalMult(a, b)),
				),
			);
		});

		it("finite * w = w", () => {
			fc.assert(
				fc.property(fc.integer({ min: 1 }), (x) =>
					assertEq(ordinalMult(Conway.real(x), unit), unit),
				),
			);
		});

		it("increasing", () => {
			fc.assert(
				fc.property(
					arbOrd3.filter(isPositive),
					arbOrd3.filter(isPositive),
					(a, b) => Conway.ge(ordinalMult(a, b), a),
				),
			);
		});

		const arbFinite = fc.integer({ min: 1, max: 32 });
		describe("finite absorption", () => {
			it("(pure infinite + finite) * pure infinite = pure infinite * pure infinite", () => {
				fc.assert(
					fc.property(
						arbOrd3,
						arbOrd3.map((x) => x.infinitePart),
						(a, b) => {
							return assertEq(
								ordinalMult(a.infinitePart, b),
								ordinalMult(a.infinitePart, b),
							);
						},
					),
				);
			});

			it("left absorption of finite * pure infinite", () => {
				fc.assert(
					fc.property(
						arbFinite,
						arbOrd3.map((x) => x.infinitePart),
						(n, a) => {
							return assertEq(ordinalMult(Conway.real(n), a), a);
						},
					),
				);
			});
		});

		const arbs: [fc.Arbitrary<Real | Conway>, string][] = [
			[arbFinite, "finite"],
			[arbOrd3, "infinite"],
		];
		const arb3s: [
			fc.Arbitrary<Real | Conway>,
			fc.Arbitrary<Real | Conway>,
			fc.Arbitrary<Real | Conway>,
			string,
		][] = [];
		for (const [arb0, name0] of arbs) {
			for (const [arb1, name1] of arbs) {
				for (const [arb2, name2] of arbs) {
					const title =
						name0 === "infinite" && name1 === "infinite" && name2 === "infinite"
							? "(general)"
							: `(${name0}, ${name1}, ${name2})`;
					arb3s.push([arb0, arb1, arb2, title]);
				}
			}
		}

		describe("left distributive: a*(b+c) = a*b + a*c", () => {
			for (const [arb0, arb1, arb2, title] of arb3s) {
				it(title, () => {
					fc.assert(
						fc.property(arb0, arb1, arb2, (a, b, c) =>
							assertEq(
								ordinalMult(a, ordinalAdd(b, c)),
								ordinalAdd(ordinalMult(a, b), ordinalMult(a, c)),
							),
						),
					);
				});
			}
		});

		describe("associative: (a*b)*c = a*(b*c)", () => {
			for (const [arb0, arb1, arb2, title] of arb3s) {
				it(title, () => {
					fc.assert(
						fc.property(arb0, arb1, arb2, (a, b, c) =>
							assertEq(
								ordinalMult(ordinalMult(a, b), c),
								ordinalMult(a, ordinalMult(b, c)),
							),
						),
					);
				});
			}
		});

		it("is repeated addition for finite multipliers", () => {
			fc.assert(
				fc.property(arbOrd3, fc.integer({ min: 1, max: 32 }), (a, n) => {
					let sum: Conway | Real = zero;
					for (let i = 0; i < n; i++) {
						sum = ordinalAdd(sum, a);
					}

					return assertEq(ordinalMult(a, Conway.real(n)), sum);
				}),
			);
		});
	});
});
