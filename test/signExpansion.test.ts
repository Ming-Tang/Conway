import fc from "fast-check";
import type { Conway, Ord } from "../conway";
import {
	birthday,
	create,
	fromReal,
	mono,
	mono1,
	one,
	unit,
	zero,
} from "../op";
import { eq, isZero, lt } from "../op";
import { neg } from "../op/arith";
import type { Seq } from "../seq";
import { signExpansion } from "../signExpansion";
import {
	arbConway1,
	arbConway2,
	arbConway3,
	arbDyadic,
	arbFiniteBigint,
	arbOrd1,
	arbOrd2,
	arbOrd3,
} from "./generators";

fc.configureGlobal({ numRuns: 200 });

const arbNum8 = arbDyadic(8);

describe("signExpansion", () => {
	const assertPropBirthday = (arb: fc.Arbitrary<Conway>) =>
		it("|signExpansion(x)| = birthday(x)", () => {
			fc.assert(
				fc.property(arb, (x) => {
					expect(birthday(x)).conwayEq(signExpansion(x).length);
				}),
			);
		});

	describe("ordinals", () => {
		const index1 = <T>(f: Seq<T>, index: Ord) => {
			try {
				return f.index(index);
			} catch (e) {
				console.error("Failed to index. ");
				console.error("index = ", index);
				console.error("seq = ", f);
				throw e;
			}
		};

		it("|SE(ord)| = ord", () => {
			fc.assert(fc.property(arbOrd3, (x) => eq(signExpansion(x).length, x)));
		});

		it("SE(ord)[i] = +", () => {
			fc.assert(
				fc.property(arbOrd3, arbOrd3, (x, i) => {
					const se = signExpansion(x);
					fc.pre(lt(i, se.length));
					return index1(se, i);
				}),
			);
		});

		it("SE(-ord)[i] = -", () => {
			fc.assert(
				fc.property(arbOrd3, arbOrd3, (x, i) => {
					const se = signExpansion(neg(x));
					fc.pre(lt(i, se.length));
					return !se.index(i);
				}),
			);
		});
	});

	describe("infinitesimals", () => {
		it("SE(c w^-1)[0] = +, SE(w^-1)[1] = -", () => {
			fc.assert(
				fc.property(
					arbNum8.filter((x) => !isZero(x)),
					() => {
						const se = signExpansion(mono1(-1n));
						expect(se.index(zero)).toBe(true);
						expect(se.index(one)).toBe(false);
					},
				),
			);
		});
	});

	describe("No0", () => {
		describe("integers", () => {
			assertPropBirthday(arbFiniteBigint.map(fromReal));
		});

		describe("reals / 2^16", () => {
			assertPropBirthday(arbNum8.map(fromReal));
		});
	});

	describe("No1", () => {
		describe("in general", () => {
			assertPropBirthday(arbConway1(arbNum8));
		});

		describe("pure infinite", () => {
			assertPropBirthday(arbConway1(arbNum8).map((x) => x.infinitePart));
		});

		describe("pure infinitesimal", () => {
			assertPropBirthday(arbConway1(arbNum8).map((x) => x.infinitesimalPart));
		});

		describe("Ord1", () => {
			assertPropBirthday(arbOrd1);
		});
	});

	describe("No2", () => {
		describe("in general", () => {
			assertPropBirthday(arbConway2(arbNum8));
		});

		describe("pure infinite", () => {
			assertPropBirthday(arbConway2(arbNum8).map((x) => x.infinitePart));
		});

		describe("pure infinitesimal", () => {
			assertPropBirthday(arbConway2(arbNum8).map((x) => x.infinitesimalPart));
		});

		describe("Ord2", () => {
			assertPropBirthday(arbOrd2);
		});
	});

	describe("No3", () => {
		describe("in general", () => {
			assertPropBirthday(arbConway3(arbNum8));
		});

		describe("pure infinite", () => {
			assertPropBirthday(arbConway3(arbNum8).map((x) => x.infinitePart));
		});

		describe("pure infinitesimal", () => {
			assertPropBirthday(arbConway3(arbNum8).map((x) => x.infinitesimalPart));
		});

		describe("Ord3", () => {
			assertPropBirthday(arbOrd3);
		});
	});
});
