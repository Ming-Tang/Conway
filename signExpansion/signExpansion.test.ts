import fc from "fast-check";
import { signExpansion } from ".";
import { birthday, fromReal, mono, mono1, one, unit, zero } from "../op";
import {
	arbConway1,
	arbConway2,
	arbConway3,
	arbDyadic,
	arbFiniteBigint,
	arbOrd1,
	arbOrd2,
	arbOrd3,
} from "../test/generators";
import { assertEq } from "../test/propsTest";
import { Conway } from "../conway";

fc.configureGlobal({ numRuns: 5000 });

const arbNum16 = arbDyadic(16);

describe("signExpansion", () => {
	it.skip("examples", () => {
		const values = [
			zero,
			one,
			unit,
			mono(2, 1),
			unit.mult(unit).mult(-4.25).add(unit.mult(2.5)),
			mono(4, 0.5),
			mono(4, mono1(unit)).add(mono(2, 1)).add(-3),
			mono(1, -1),
			mono(4, -1),
			mono(4, -1).add(mono(3, -5)),
			new Conway([
				[-1, 1],
				[-3, -2],
				[-5, 4],
				[-7, -8],
				[-9, 16],
			]),
			mono(1, 0.5),
			mono(1, -0.5),
		];

		for (const v of values) {
			console.log(`birthday(${v}) =`, birthday(v));
			console.log(`signExpansion(${v}) =`, signExpansion(v));
			console.log("");
		}
	});

	const assertPropBirthday = (arb: fc.Arbitrary<Conway>) =>
		it("|signExpansion(x)| = birthday(x)", () => {
			fc.assert(
				fc.property(arb, (x) => {
					try {
						return assertEq(
							birthday(x),
							signExpansion(x).length,
							"birthday",
							"|signExpansion|",
						);
					} catch (e) {
						console.log("Value: ", x);
						console.log("Birthday: ", birthday(x));
						console.log("Sign expansion: ", signExpansion(x));
						throw e;
					}
				}),
			);
		});

	describe("No0", () => {
		describe("integers", () => {
			assertPropBirthday(arbFiniteBigint.map(fromReal));
		});

		describe("reals / 2^16", () => {
			assertPropBirthday(arbNum16.map(fromReal));
		});
	});

	describe("No1", () => {
		describe("in general", () => {
			assertPropBirthday(arbConway1(arbNum16));
		});

		describe("pure infinite", () => {
			assertPropBirthday(arbConway1(arbNum16).map((x) => x.infinitePart));
		});

		describe("pure infinitesimal", () => {
			assertPropBirthday(arbConway1(arbNum16).map((x) => x.infinitesimalPart));
		});

		describe("Ord1", () => {
			assertPropBirthday(arbOrd1);
		});
	});

	describe("No2", () => {
		describe("in general", () => {
			assertPropBirthday(arbConway2(arbNum16));
		});

		describe("pure infinite", () => {
			assertPropBirthday(arbConway2(arbNum16).map((x) => x.infinitePart));
		});

		describe("pure infinitesimal", () => {
			assertPropBirthday(arbConway2(arbNum16).map((x) => x.infinitesimalPart));
		});

		describe("Ord2", () => {
			assertPropBirthday(arbOrd2);
		});
	});

	describe("No3", () => {
		describe("in general", () => {
			assertPropBirthday(arbConway3(arbNum16));
		});

		describe("pure infinite", () => {
			assertPropBirthday(arbConway3(arbNum16).map((x) => x.infinitePart));
		});

		describe("pure infinitesimal", () => {
			assertPropBirthday(arbConway3(arbNum16).map((x) => x.infinitesimalPart));
		});

		describe("Ord3", () => {
			assertPropBirthday(arbOrd3);
		});
	});
});
