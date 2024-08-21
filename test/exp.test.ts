import fc from "fast-check";
import { add, mult } from "../op/arith";
import { exp, factorLeadLow, log, log1pLow } from "../op/exp";
import { arbConway2, arbFinite, arbFiniteBigint } from "./generators";
import { eq, isPositive, isZero } from "../op/comparison";
import { Conway } from "../conway";
import { realToNumber, type Real } from "../real";
import { ensure, mono, mono1, one, unit, zero } from "../op";
import { assertEq } from "./propsTest";

const close = (a: Real | Conway, b: Real | Conway) => {
	expect(ensure(a)).toEqual(ensure(b));
};

const terms = 4;

const arb = arbConway2(
	arbFinite.filter((x) => Math.abs(x) > 1e-4),
	{ maxLength: 3 },
);
const arbWithBigint = arbConway2(arbFiniteBigint, { maxLength: 2 });

describe("factorLeadLow", () => {
	it("factor monomials", () => {
		fc.assert(
			fc.property(
				arbWithBigint
					.filter(isPositive)
					.map((x) => mono(x.leadingCoeff, x.leadingPower ?? Conway.zero)),
				(x) => {
					const { inf, r, low } = factorLeadLow(x);
					const lead = mono(r, inf);
					return eq(lead, x) && isZero(low);
				},
			),
		);
	});

	// TODO doesn't work
	it.skip("factor positives", () => {
		fc.assert(
			fc.property(arb.filter(isPositive), (x) => {
				const { inf, r, low } = factorLeadLow(x);
				const lead = mono(r, inf);
				return eq(mult(lead, low.add(Conway.one)), x);
			}),
		);
	});
});

describe("log1pLow", () => {
	it("infinitesimals", () => {
		fc.assert(
			fc.property(
				arb.map((x) => x.infinitesimalPart),
				(x) => {
					log1pLow(x, 10);
					return true;
				},
			),
			{ numRuns: 200 },
		);
	});
});

describe("log", () => {
	describe("log of product is sum of log", () => {
		it("pure infinite", () => {
			fc.assert(
				fc.property(
					arb.filter(isPositive).map((x) => x.infinitePart),
					arb.filter(isPositive).map((x) => x.infinitePart),
					(a, b) => {
						const ab = mult(a, b);
						fc.pre(isPositive(ab));
						return close(log(ab, terms), add(log(a, terms), log(b, terms)));
					},
				),
				{ numRuns: 100 },
			);
		});

		it("pure infinitesimal", () => {
			fc.assert(
				fc.property(
					arb.filter(isPositive).map((x) => add(one, x.infinitesimalPart)),
					arb.filter(isPositive).map((x) => add(one, x.infinitesimalPart)),
					(a, b) => {
						const ab = mult(a, b);
						fc.pre(isPositive(ab));
						return close(log(ab, terms), add(log(a, terms), log(b, terms)));
					},
				),
				{ numRuns: 100 },
			);
		});

		it("1 + pure infinitesimal", () => {
			fc.assert(
				fc.property(
					arb.filter(isPositive).map((x) => add(one, x.infinitesimalPart)),
					arb.filter(isPositive).map((x) => add(one, x.infinitesimalPart)),
					(a, b) => {
						const ab = mult(a, b);
						fc.pre(isPositive(ab));
						return close(log(ab, terms), add(log(a, terms), log(b, terms)));
					},
				),
				{ numRuns: 100 },
			);
		});

		it("surreals in general", () => {
			fc.assert(
				fc.property(arb.filter(isPositive), arb.filter(isPositive), (a, b) => {
					const ab = mult(a, b);
					fc.pre(isPositive(ab));
					return close(log(ab, terms), add(log(a, terms), log(b, terms)));
				}),
				{ numRuns: 100 },
			);
		});
	});
});

describe("exp", () => {
	describe("exp(0) = 1", () => {
		expect(exp(zero).toString()).toEqual(one.toString());
	});

	it("exp of reals", () => {
		fc.assert(fc.property(arbFinite, (x) => close(Math.exp(x), exp(x, terms))));
	});

	it("exp of sum - pure infinite", () => {
		fc.assert(
			fc.property(
				arb.filter(isPositive).map((x) => mono(1n, x)),
				arb.filter(isPositive).map((x) => mono(1n, x)),
				(a, b) => close(exp(add(a, b)), mult(exp(a), exp(b))),
			),
			{ numRuns: 100 },
		);
	});

	it("exp of sum - pure infinitesimal", () => {
		fc.assert(
			fc.property(
				arb.map((x) => x.infinitesimalPart),
				arb.map((x) => x.infinitesimalPart),
				(a, b) =>
					close(exp(add(a, b), terms), mult(exp(a, terms), exp(b, terms))),
			),
			{ numRuns: 100 },
		);
	});

	it("exp of sum", () => {
		fc.assert(
			fc.property(arb, arb, (a, b) =>
				close(exp(add(a, b), terms), mult(exp(a, terms), exp(b, terms))),
			),
			{ numRuns: 100 },
		);
	});
});

// https://arxiv.org/pdf/2008.06878
// Example 16.1
describe("(w + 1)^w = e w^w - e w^(w-1)/2 + ...", () => {
	it("expand to 5 terms", () => {
		const expanded = ensure(exp(unit.mult(log(unit.add(one), 10)), 10));
		[...expanded].slice(0, 2).forEach(([p, c], i) => {
			const s = i % 2 === 0 ? 1 : -1;
			assertEq(unit.sub(i), p);
			expect(c).toBeCloseTo((s * Math.E) / (i + 1));
		});
	});
});
