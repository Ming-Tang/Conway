import fc from "fast-check";
import { zero, one, birthday } from "../op";
import { right, roundToOrd } from "../op/range";
import { assertEq } from "./propsTest";
import { arbConway3, arbFiniteBigint, arbOrd3 } from "./generators";
import { isOrdinal, succ } from "../op/ordinal";
import { signExpansion } from "../signExpansion";
import { ge, gt, isPositive, le, ne } from "../op/comparison";
import { add } from "../op/arith";

describe("roundToOrd", () => {
	it("roundToOrd(x) = x for ordinals", () => {
		fc.assert(
			fc.property(arbOrd3, (x) => {
				assertEq(roundToOrd(x), x);
			}),
		);
	});

	it("roundToOrd(x) is ordinal", () => {
		fc.assert(
			fc.property(arbConway3(arbFiniteBigint), (x) => {
				return isOrdinal(roundToOrd(x));
			}),
		);
	});

	it("roundToOrd(x + y) >= x for ordinal x and y > 0", () => {
		fc.assert(
			fc.property(
				arbOrd3,
				arbConway3(arbFiniteBigint).filter(isPositive),
				(x, y) => {
					return ge(roundToOrd(add(x, y)), x);
				},
			),
		);
	});

	it("birthday(roundToOrd(x)) <= birthday(x)", () => {
		fc.assert(
			fc.property(arbConway3(arbFiniteBigint), (x) => {
				expect(le(birthday(roundToOrd(x)), birthday(x))).toBe(true);
			}),
		);
	});

	it("roundToOrd(x) >= x", () => {
		fc.assert(
			fc.property(arbConway3(arbFiniteBigint), (x) => {
				expect(ge(roundToOrd(x), x)).toBe(true);
			}),
		);
	});

	it("signExpansion(roundToOrd(x)) is all plus", () => {
		fc.assert(
			fc.property(arbConway3(arbFiniteBigint), (x) => {
				const v = signExpansion(roundToOrd(x));
				expect(v.isConstant).toBe(true);
			}),
		);
	});
});

describe("right(x) = {x|}", () => {
	it("constants (integer)", () => {
		assertEq(right(zero), one);
		assertEq(right(one), 2n);
		assertEq(right(-1n), zero);
		assertEq(right(-2n), zero);
	});

	it("constants (integer plus fraction)", () => {
		assertEq(right(0.5), one);
		assertEq(right(-0.5), zero);
		assertEq(right(3.14), 4n);
		assertEq(right(-3.14), zero);
	});

	it("{x|} != x", () => {
		fc.assert(fc.property(arbConway3(arbFiniteBigint), (x) => ne(right(x), x)));
	});

	it("{x|} > x", () => {
		fc.assert(fc.property(arbConway3(arbFiniteBigint), (x) => gt(right(x), x)));
	});

	it("{o|} = succ(o) for ordinal number o", () => {
		fc.assert(
			fc.property(arbOrd3, (x) => assertEq(right(x), succ(x), "right", "succ")),
		);
	});

	it("signExpansion(right(x)) is all plus", () => {
		fc.assert(
			fc.property(arbConway3(arbFiniteBigint), (x) => {
				const v = signExpansion(right(x));
				expect(v.isConstant).toBe(true);
				// console.log(right(x), v);
				// throw new Error();
			}),
		);
	});

	it.skip("finite values round to bigint", () => {
		const arbFinite = arbConway3(arbFiniteBigint)
			.map((x) => x.sub(x.infinitePart))
			.filter((x) => !x.isAboveReals);
		fc.assert(fc.property(arbFinite, (x) => {}));
	});
});
