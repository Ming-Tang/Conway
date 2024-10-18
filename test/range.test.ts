import fc from "fast-check";
import { zero, one, birthday, ensure, mono1, mono } from "../op";
import { right, roundToOrd } from "../op/range";
import { assertEq } from "./propsTest";
import { arbConway3, arbFiniteBigint, arbOrd3 } from "./generators";
import { isOrdinal, succ } from "../op/ordinal";
import { signExpansion } from "../signExpansion";
import {
	ge,
	gt,
	isNegative,
	isPositive,
	isZero,
	le,
	lt,
	ne,
} from "../op/comparison";
import { add } from "../op/arith";
import type { Ord } from "../conway";

fc.configureGlobal({ numRuns: 1000, verbose: true });

describe("roundToOrd", () => {
	it("constants", () => {
		assertEq(roundToOrd(0n), 0n);
		assertEq(roundToOrd(-1n), 0n);
		assertEq(roundToOrd(-1.5), 0n);
		assertEq(roundToOrd(1n), 1n);
		assertEq(roundToOrd(5.5), 6n);
		assertEq(roundToOrd(0.25), 1n);
		assertEq(roundToOrd(mono1(-1)), 1n);
		assertEq(roundToOrd(add(0.25, mono(0.015625, -0.0625))), 1n);
		assertEq(roundToOrd(add(2.1, mono1(-1))), 3n);
	});

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
				expect(isZero(v.length) || v.index(zero)).toBe(true);
			}),
		);
	});

	it("signExpansion(x)[birthday(roundToOrd(x))] is minus ", () => {
		fc.assert(
			fc.property(arbConway3(arbFiniteBigint), (x) => {
				const b: Ord = ensure(birthday(roundToOrd(x))) as Ord;
				const se = signExpansion(x);
				fc.pre(lt(b, se.length));
				expect(se.index(b)).toBe(false);
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
