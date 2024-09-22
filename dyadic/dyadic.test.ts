import fc from "fast-check";
import {
	Dyadic,
	dyadicAbs,
	dyadicAdd,
	dyadicCompare,
	dyadicEq,
	dyadicFromBigint,
	dyadicFromNumber,
	dyadicGe,
	dyadicLe,
	dyadicMult,
	dyadicOne,
	dyadicToMixed,
	dyadicZero,
} from ".";
import {
	propCommAssoc,
	propDist,
	propIdentity,
	propTotalOrder,
	propZero,
} from "../test/propsTest";

const arbDyadic = fc
	.tuple(
		fc.bigInt({ min: -1n << 8n, max: 1n << 8n }),
		fc.bigInt({ min: 0n, max: 1n << 4n }),
	)
	.map(([x, y]) => new Dyadic(x, y));

const arbNumber = fc.float({
	noDefaultInfinity: true,
	noNaN: true,
	min: -1e4,
	max: -1e4,
});

describe("constructor", () => {
	it("if numerator is zero, power is zero", () => {
		fc.assert(fc.property(fc.bigInt(), (x) => new Dyadic(0n, x).power === 0n));
	});

	it("power is never negative", () => {
		fc.assert(fc.property(arbDyadic, (x) => x.power >= 0n));
	});
});

describe("fromNumber", () => {
	it("equal to quotient", () => {
		fc.assert(
			fc.property(arbNumber, (x) => {
				expect(dyadicFromNumber(x).quotient).toBeCloseTo(x);
			}),
		);
	});
});

describe("toMixed", () => {
	it("add back", () => {
		fc.assert(
			fc.property(arbDyadic, (x) => {
				const [n, q] = dyadicToMixed(x);
				expect(dyadicAdd(dyadicFromBigint(n), q)).toEqual(x);
			}),
		);
	});

	it("abs of fractional part is between 0 and 1", () => {
		fc.assert(
			fc.property(arbDyadic, (x) => {
				const [, q] = dyadicToMixed(x);
				const aq = dyadicAbs(q);
				expect(dyadicGe(aq, dyadicZero)).toBe(true);
				expect(dyadicLe(aq, dyadicOne)).toBe(true);
			}),
		);
	});
});

describe("ordering", () => {
	propTotalOrder(it, arbDyadic, dyadicCompare, dyadicEq);
});

describe("add", () => {
	propIdentity(it, arbDyadic, dyadicZero, dyadicAdd, dyadicEq);
	propCommAssoc(it, arbDyadic, dyadicAdd, dyadicEq);
});

describe("mult", () => {
	propZero(it, arbDyadic, dyadicZero, dyadicMult, dyadicEq);
	propIdentity(it, arbDyadic, dyadicOne, dyadicMult, dyadicEq);
	propCommAssoc(it, arbDyadic, dyadicMult, dyadicEq);
	propDist(it, arbDyadic, dyadicAdd, dyadicMult, dyadicEq);
});
