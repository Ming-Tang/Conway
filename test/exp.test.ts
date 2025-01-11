import fc from "fast-check";
import "./expect.test";
import type { Conway0 } from "../conway";
import { dyadicPow2 } from "../dyadic/arith";
import { ensure, isNegative, mono, mono1, neg, one, unit, zero } from "../op";
import { eq, isPositive, isZero } from "../op";
import { add, mult, sub } from "../op/arith";
import { exp, factorLeadLow, g, index, log, log1pLow } from "../op/exp";
import { realToDyadic } from "../real";
import {
	arbConway2,
	arbConway3,
	arbDyadic,
	arbFinite,
	arbFiniteBigint,
	arbOrd3,
} from "./generators";

const close = (a: Conway0, b: Conway0) => {
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
					.map((x) => mono(x.leadingCoeff, x.leadingPower ?? zero)),
				(x) => {
					const { inf, r, low } = factorLeadLow(x);
					const lead = mono(r, inf);
					return eq(lead, x) && isZero(low);
				},
			),
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
				{ numRuns: 20 },
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
				{ numRuns: 20 },
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
				{ numRuns: 20 },
			);
		});

		it("surreals in general", () => {
			fc.assert(
				fc.property(arb.filter(isPositive), arb.filter(isPositive), (a, b) => {
					const ab = mult(a, b);
					fc.pre(isPositive(ab));
					return close(log(ab, terms), add(log(a, terms), log(b, terms)));
				}),
				{ numRuns: 20 },
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
		const expanded = ensure(exp(mult(unit, log(add(unit, one), 10)), 10));
		[...expanded].slice(0, 2).forEach(([p, c], i) => {
			const s = i % 2 === 0 ? 1 : -1;
			expect(sub(unit, i)).conwayEq(p);
			expect(realToDyadic(c).quotient).toBeCloseTo((s * Math.E) / (i + 1));
		});
	});
});

describe("g function", () => {
	describe("constants", () => {
		it("g(w^-1) = 0", () => {
			expect(g(mono1(-1n))).conwayEq(0n);
		});

		it("g(w^-2) = -1", () => {
			expect(g(mono1(-2n))).conwayEq(-1n);
		});

		it("g(2 w^-1) = w^-1", () => {
			expect(g(mono(2n, -1n))).conwayEq(mono1(-1n));
		});
	});

	it("x is not infinitesimal", () => {
		fc.assert(
			fc.property(
				arbConway3(arbDyadic(8)).filter(
					(x) => isPositive(x) && !isNegative(index(x)),
				),
				(x) => eq(g(x), x),
			),
		);
	});

	it("Theorem 10.15, n = 0", () => {
		fc.assert(fc.property(arbOrd3, (b) => eq(g(mono1(neg(b))), sub(1n, b))));
	});

	it("Theorem 10.15", () => {
		fc.assert(
			fc.property(
				arbOrd3,
				fc.bigInt({ min: -20n, max: 0n }).map(dyadicPow2),
				(b, m) => eq(g(mono(m, neg(b))), sub(m, b)),
			),
		);
	});
});
