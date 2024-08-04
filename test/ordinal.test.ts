import fc from "fast-check";
import { Conway } from "../conway";
import { arbConway3, arbFiniteBigint, arbOrd2 } from "./generators";

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

		it("ordinalAdd result is ordinal", () => {
			fc.assert(
				fc.property(
					arbConway3(arbFiniteBigint).filter((x) => x.isOrdinal),
					arbConway3(arbFiniteBigint).filter((x) => x.isOrdinal),
					(a, b) => a.ordinalAdd(b).isOrdinal,
				),
				{ numRuns: 200 },
			);
		});

		it("increasing", () => {
			fc.assert(
				fc.property(arbOrd2, arbOrd2, (a, b) => Conway.ge(a.ordinalAdd(b), a)),
			);
		});

		it("strictly increasing (<) on right argument", () => {
			fc.assert(
				fc.property(arbOrd2, arbOrd2, arbOrd2, (a, b, c) => {
					fc.pre(Conway.lt(a, b));
					return Conway.lt(c.ordinalAdd(a), c.ordinalAdd(b));
				}),
				{ numRuns: 200 },
			);
		});

		it("increasing (<=) on right argument", () => {
			fc.assert(
				fc.property(arbOrd2, arbOrd2, arbOrd2, (a, b, c) => {
					fc.pre(Conway.lt(a, b));
					return Conway.le(a.ordinalAdd(c), b.ordinalAdd(c));
				}),
				{ numRuns: 200 },
			);
		});

		it("static method is equivalent to instance method", () => {
			fc.assert(
				fc.property(arbOrd2, arbOrd2, (a, b) =>
					Conway.eq(a.ordinalAdd(b), Conway.ordinalAdd(a, b)),
				),
				{ numRuns: 200 },
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
				{ numRuns: 200 },
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
				{ numRuns: 100 },
			);
		});

		it("ordinalRightSub result can be added back", () => {
			fc.assert(
				fc.property(
					arbConway3(arbFiniteBigint).filter((x) => x.isOrdinal),
					arbConway3(arbFiniteBigint).filter((x) => x.isOrdinal),
					(a, b) => {
						fc.pre(Conway.ge(b, a));
						const c = a.ordinalRightSub(b);
						return a.ordinalAdd(b).eq(c);
					},
				),
				{ numRuns: 100 },
			);
		});

		it("static method is equivalent to instance method", () => {
			fc.assert(
				fc.property(arbOrd2, arbOrd2, (a, b) => {
					fc.pre(Conway.ge(b, a));
					return Conway.eq(a.ordinalRightSub(b), Conway.ordinalRightSub(a, b));
				}),
				{ numRuns: 200 },
			);
		});
	});
});
