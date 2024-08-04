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

		it("any ordinal ordinalAdd zero", () => {
			fc.assert(
				fc.property(
					arbConway3(arbFiniteBigint).filter((x) => x.isOrdinal),
					(a) => a.ordinalAdd(Conway.zero).eq(a),
				),
			);
		});
		it("zero ordinalAdd any ordinal", () => {
			fc.assert(
				fc.property(
					arbConway3(arbFiniteBigint).filter((x) => x.isOrdinal),
					(a) => Conway.zero.ordinalAdd(a).eq(a),
				),
			);
		});

		it("ordinalAdd result is ordinal", () => {
			fc.assert(
				fc.property(
					arbConway3(arbFiniteBigint).filter((x) => x.isOrdinal),
					arbConway3(arbFiniteBigint).filter((x) => x.isOrdinal),
					(a, b) => a.ordinalAdd(b).isOrdinal,
				),
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
			);
		});

		it("increasing (<=) on right argument", () => {
			fc.assert(
				fc.property(arbOrd2, arbOrd2, arbOrd2, (a, b, c) => {
					fc.pre(Conway.lt(a, b));
					return Conway.le(a.ordinalAdd(c), b.ordinalAdd(c));
				}),
			);
		});

		it("static method is equivalent to instance method", () => {
			fc.assert(
				fc.property(arbOrd2, arbOrd2, (a, b) =>
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
				fc.property(arbOrd2, arbOrd2, (a, b) => {
					fc.pre(Conway.ge(b, a));
					return Conway.eq(a.ordinalRightSub(b), Conway.ordinalRightSub(a, b));
				}),
			);
		});
	});
});
