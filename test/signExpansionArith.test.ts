import fc from "fast-check";
import { add, eq, mono1, mult, neg, sub } from "../op";
import { add as addSE, sub as subSE } from "../signExpansion/arith/add";
import { mono1 as mono1SE } from "../signExpansion/arith/mono1";
import { mult as multSE } from "../signExpansion/arith/mult";
import { neg as negSE } from "../signExpansion/arith/neg";
import {
	makeReader as R,
	conwayFromSignExpansion,
	signExpansionFromConway,
} from "../signExpansion/reader";
import { arbConway3, arbDyadic } from "./generators";

const arbWithSE = arbConway3(arbDyadic()).map(
	(x) => [x, [...signExpansionFromConway(x)]] as const,
);

fc.configureGlobal({ numRuns: 100 });

describe("signExpansion arithmetic operations", () => {
	it("neg", () => {
		fc.assert(
			fc.property(arbWithSE, ([x, x1]) =>
				eq(neg(x), conwayFromSignExpansion(R(negSE(R(x1))))),
			),
		);
	});

	it("mono1", () => {
		fc.assert(
			fc.property(arbWithSE, ([x, x1]) =>
				eq(mono1(x), conwayFromSignExpansion(R(mono1SE(R(x1))))),
			),
		);
	});

	it("add", () => {
		fc.assert(
			fc.property(arbWithSE, arbWithSE, ([x, x1], [y, y1]) =>
				eq(add(x, y), conwayFromSignExpansion(R(addSE(R(x1), R(y1))))),
			),
		);
	});

	it("sub", () => {
		fc.assert(
			fc.property(arbWithSE, arbWithSE, ([x, x1], [y, y1]) =>
				eq(sub(x, y), conwayFromSignExpansion(R(subSE(R(x1), R(y1))))),
			),
		);
	});

	it("mult", () => {
		fc.assert(
			fc.property(arbWithSE, arbWithSE, ([x, x1], [y, y1]) =>
				eq(mult(x, y), conwayFromSignExpansion(R(multSE(R(x1), R(y1))))),
			),
		);
	});
});
