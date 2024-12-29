import fc from "fast-check";
import {
	dyadicFromBigint,
	dyadicLe,
	dyadicNeg,
} from "../dyadic";
import { dyadicNew } from "../dyadic/class";
import { dyadicOrdHash } from "../dyadic/ordHash";
import { arbDyadic } from "./generators";

describe("ordHashDyadic", () => {
	it("preserves ordering after halfing for positive", () => {
		fc.assert(
			fc.property(arbDyadic(64), (x) => {
				fc.pre(x.isPositive);
				const xh = x.half();
				expect(dyadicOrdHash(xh)).toBeLessThanOrEqual(dyadicOrdHash(x));
			}),
		);
	});

	it("preserves ordering for k / 2^10 vs. (k+1) / 2^10", () => {
		fc.assert(
			fc.property(fc.bigInt(), (k) => {
				const x = dyadicNew(k, 10n);
				const x1 = dyadicNew(k + 1n, 10n);
				expect(dyadicOrdHash(x)).toBeLessThanOrEqual(dyadicOrdHash(x1));
			}),
		);
	});

	it("preserves equality", () => {
		fc.assert(
			fc.property(arbDyadic(64), (x) => {
				expect(dyadicOrdHash(x)).toBe(dyadicOrdHash(x));
			}),
		);
	});

	it("preserves reverse ordering on negation", () => {
		fc.assert(
			fc.property(arbDyadic(64), arbDyadic(64), (x, y) => {
				fc.pre(dyadicLe(x, y));
				expect(dyadicOrdHash(x) <= dyadicOrdHash(y)).toBe(
					dyadicOrdHash(dyadicNeg(x)) >= dyadicOrdHash(dyadicNeg(y)),
				);
			}),
		);
	});

	it("preserves ordering", () => {
		fc.assert(
			fc.property(arbDyadic(64), arbDyadic(64), (x, y) => {
				fc.pre(dyadicLe(x, y));
				expect(dyadicOrdHash(x)).toBeLessThanOrEqual(dyadicOrdHash(y));
			}),
		);
	});

	it("max delta of 1 for delta of 1 within integers", () => {
		fc.assert(
			fc.property(fc.bigInt({ min: 1n }), (x) => {
				expect(dyadicOrdHash(dyadicFromBigint(x + 1n))).toBeLessThanOrEqual(
					dyadicOrdHash(dyadicFromBigint(x)) + 1n,
				);
			}),
		);
	});
});
