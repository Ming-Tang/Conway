import fc from "fast-check";
import { zero, one, birthday, ensure } from "../op";
import { right, roundToOrd } from "../op/range";
import { assertEq } from "./propsTest";
import { arbConway3, arbFiniteBigint, arbOrd3 } from "./generators";
import { isOrdinal, pred, succ } from "../op/ordinal";
import { signExpansion } from "../signExpansion";
import {
	ge,
	gt,
	isNegative,
	isPositive,
	isZero,
	le,
	ne,
} from "../op/comparison";
import { add } from "../op/arith";
import { ensureOrd } from "../seq/helpers";
import type { Ord } from "../conway";

describe("roundToOrd", () => {
	it("roundToOrd(x) = x for ordinals", () => {
		fc.assert(
			fc.property(arbOrd3, (x) => {
				assertEq(roundToOrd(x), x, "roundToOrd(x)", "x");
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

	it("roundToOrd(o + low) = succ(o) for ordinal number o and positive infinitesimal low", () => {
		fc.assert(
			fc.property(
				arbOrd3,
				arbConway3(arbFiniteBigint)
					.map((x) => x.infinitesimalPart)
					.filter(isPositive),
				(x, l) =>
					assertEq(roundToOrd(add(x, l)), succ(x), "roundToOrd(o + low)", "o"),
			),
		);
	});

	it("roundToOrd(o - low) = o for ordinal number o and positive infinitesimal low", () => {
		fc.assert(
			fc.property(
				arbOrd3,
				arbConway3(arbFiniteBigint)
					.map((x) => x.infinitesimalPart)
					.filter(isNegative),
				(x, l) =>
					assertEq(roundToOrd(add(x, l)), x, "roundToOrd(o - low)", "o"),
			),
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

	it("{o + low|} = succ(o) for ordinal number o and positive infinitesimal low", () => {
		fc.assert(
			fc.property(
				arbOrd3,
				arbConway3(arbFiniteBigint)
					.map((x) => x.infinitesimalPart)
					.filter(isPositive),
				(x, l) => assertEq(right(add(x, l)), succ(x), "right", "succ"),
			),
		);
	});

	it("{o - low|} = o for ordinal number o and positive infinitesimal low", () => {
		fc.assert(
			fc.property(
				arbOrd3,
				arbConway3(arbFiniteBigint)
					.map((x) => x.infinitesimalPart)
					.filter(isNegative),
				(x, l) => assertEq(right(add(x, l)), x, "right", "succ"),
			),
		);
	});

	it("signExpansion(right(x)) is all plus", () => {
		fc.assert(
			fc.property(arbConway3(arbFiniteBigint), (x) => {
				const v = signExpansion(right(x));
				expect(v.isConstant).toBe(true);
			}),
		);
	});

	it("if right(x) = k, then signExpansion(right(x)) has prefix of +^k & - & ... for non-ordinal x", () => {
		fc.assert(
			fc.property(
				arbConway3(arbFiniteBigint).filter((x) => !isZero(x) && !isOrdinal(x)),
				(x) => {
					const rx = ensure(right(x)) as Ord;
					fc.pre(isPositive(rx));
					const se = signExpansion(x);
					// console.log(({ x, rx, se }));
					expect(se.index(zero)).toBe(true);
					expect(se.index(rx)).toBe(false);
				},
			),
		);
	});

	it.skip("finite values round to bigint", () => {
		const arbFinite = arbConway3(arbFiniteBigint)
			.map((x) => x.sub(x.infinitePart))
			.filter((x) => !x.isAboveReals);
		fc.assert(fc.property(arbFinite, (x) => {}));
	});
});
