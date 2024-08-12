import fc from "fast-check";
import { signExpansion } from ".";
import { birthday, mono, mono1, one, unit, zero } from "../op";
import {
	arbConway1,
	arbConway2,
	arbConway3,
	arbDyadic,
} from "../test/generators";
import { assertEq } from "../test/propsTest";

fc.configureGlobal({ numRuns: 5000 });

const arbNum16 = arbDyadic(16);

describe("signExpansion", () => {
	it("examples", () => {
		const values = [
			zero,
			one,
			unit,
			mono(2, 1),
			unit.add(unit.mult(2.5)),
			mono(4, 0.5),
			mono(4, mono1(unit)).add(mono(2, 1)).add(-3),
		];

		for (const v of values) {
			console.log(`birthday(${v}) =`, birthday(v));
			console.log(`signExpansion(${v}) =`, signExpansion(v));
		}
	});

	describe("No1", () => {
		it("|signExpansion(x)| = birthday(x)", () => {
			fc.assert(
				fc.property(arbConway1(arbNum16), (x) =>
					assertEq(signExpansion(x).length, birthday(x)),
				),
			);
		});
	});

	describe("No2", () => {
		it("|signExpansion(x)| = birthday(x)", () => {
			fc.assert(
				fc.property(arbConway2(arbNum16), (x) =>
					assertEq(signExpansion(x).length, birthday(x)),
				),
			);
		});
	});

	describe("No3", () => {
		it("|signExpansion(x)| = birthday(x)", () => {
			fc.assert(
				fc.property(arbConway3(arbNum16), (x) =>
					assertEq(signExpansion(x).length, birthday(x)),
				),
			);
		});
	});
});
