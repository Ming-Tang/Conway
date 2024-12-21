import fc from "fast-check";
import type { Ord } from "../conway";
import { birthday, create, ensure, eq, mono, mono1, one, zero } from "../op";
import { ge, gt, isNegative, isPositive, isZero, le, lt, ne } from "../op";
import { add } from "../op/arith";
import { isOrdinal, succ } from "../op/ordinal";
import { right, roundToOrd } from "../op/range";
import { signExpansion } from "../signExpansion";
import { commonAncestor, isSimpler } from "../signExpansion/simplicity";
import { arbConway3, arbFiniteBigint, arbOrd3 } from "./generators";

fc.configureGlobal({ numRuns: 1000, verbose: true });

describe("roundToOrd", () => {
	it("constants", () => {
		expect(roundToOrd(0n)).conwayEq(0n);
		expect(roundToOrd(-1n)).conwayEq(0n);
		expect(roundToOrd(-1.5)).conwayEq(0n);
		expect(roundToOrd(1n)).conwayEq(1n);
		expect(roundToOrd(5.5)).conwayEq(6n);
		expect(roundToOrd(0.25)).conwayEq(1n);
		expect(roundToOrd(mono1(-1))).conwayEq(1n);
		expect(roundToOrd(add(0.25, mono(0.015625, -0.0625)))).conwayEq(1n);
		expect(roundToOrd(add(2.1, mono1(-1)))).conwayEq(3n);
	});

	it("roundToOrd(x) = x for ordinals", () => {
		fc.assert(
			fc.property(arbOrd3, (x) => {
				expect(roundToOrd(x)).conwayEq(x);
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
				(x, l) => {
					expect(roundToOrd(add(x, l))).conwayEq(succ(x));
				},
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
				(x, l) => {
					expect(roundToOrd(add(x, l))).conwayEq(x);
				},
			),
		);
	});
});

describe("right(x) = {x|}", () => {
	it("constants (integer)", () => {
		expect(right(zero)).conwayEq(one);
		expect(right(one)).conwayEq(2n);
		expect(right(-1n)).conwayEq(zero);
		expect(right(-2n)).conwayEq(zero);
	});

	it("constants (integer plus fraction)", () => {
		expect(right(0.5)).conwayEq(one);
		expect(right(-0.5)).conwayEq(zero);
		expect(right(3.14)).conwayEq(4n);
		expect(right(-3.14)).conwayEq(zero);
	});

	it("{x|} != x", () => {
		fc.assert(fc.property(arbConway3(arbFiniteBigint), (x) => ne(right(x), x)));
	});

	it("{x|} > x", () => {
		fc.assert(fc.property(arbConway3(arbFiniteBigint), (x) => gt(right(x), x)));
	});

	it("{o|} = succ(o) for ordinal number o", () => {
		fc.assert(
			fc.property(arbOrd3, (x) => {
				expect(right(x)).conwayEq(succ(x));
			}),
		);
	});

	it("{o + low|} = succ(o) for ordinal number o and positive infinitesimal low", () => {
		fc.assert(
			fc.property(
				arbOrd3,
				arbConway3(arbFiniteBigint)
					.map((x) => x.infinitesimalPart)
					.filter(isPositive),
				(x, l) => {
					expect(right(add(x, l))).conwayEq(succ(x));
				},
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
				(x, l) => {
					expect(right(add(x, l))).conwayEq(x);
				},
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
});
