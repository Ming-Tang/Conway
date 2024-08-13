import fc from "fast-check";
import { type Real, Conway } from "../conway";
import { eq } from "../op/comparison";
import { ensure } from "../op";

type BinOp<T> = (a: T, b: T) => T;

export const assertEq = (
	a: Real | Conway,
	b: Real | Conway,
	leftName = "a",
	rightName = "b",
) => {
	if (!eq(a, b)) {
		throw new Error(
			`not equal: ${leftName}=[${a}], ${rightName}=[${b}]\nRepr:\n  ${leftName}=${JSON.stringify(ensure(a).toJson(false))},\n  ${rightName}=${JSON.stringify(Conway.ensure(b).toJson(false))}`,
		);
	}
	return true;
};

export interface RunConfig {
	numRuns?: number;
}

export const arbPair = <A, B>(
	a: fc.Arbitrary<A>,
	b: fc.Arbitrary<B>,
): fc.Arbitrary<[A, B]> => a.chain((a1) => b.map((b1) => [a1, b1]));

type It = (name: string, func: () => void) => void;

export const propTotalOrder = <T>(
	it: It,
	arb: fc.Arbitrary<T>,
	comp: (a: T, b: T) => number,
	equals?: (a: T, b: T) => boolean,
	config?: RunConfig,
) => {
	const le = (a: T, b: T) => comp(a, b) >= 0;
	const eq = equals ?? ((a: T, b: T) => comp(a, b) === 0);

	it("reflexive", () => {
		fc.assert(
			fc.property(arb, (x) => eq(x, x)),
			config,
		);
	});

	it("antisymmetric", () => {
		fc.assert(
			fc.property(arb, arb, (x, y) => comp(x, y) === -comp(y, x)),
			config,
		);
	});

	it("transitive", () => {
		fc.assert(
			fc.property(
				arb,
				arb,
				arb,
				(x, y, z) => !(le(x, y) && le(y, z)) || le(x, z),
			),
			config,
		);
	});
};

export const propCommAssoc = <T>(
	it: It,
	arb: fc.Arbitrary<T>,
	op: BinOp<T>,
	eq: (a: T, b: T) => boolean,
	config?: RunConfig,
) => {
	it("commutative", () => {
		fc.assert(
			fc.property(arb, arb, (x, y) => eq(op(y, x), op(x, y))),
			config,
		);
	});

	it("associative", () => {
		fc.assert(
			fc.property(arb, arb, arb, (x, y, z) =>
				eq(op(op(x, y), z), op(x, op(y, z))),
			),
			config,
		);
	});
};

export const propIdentity = <T>(
	it: It,
	arb: fc.Arbitrary<T>,
	id: T,
	op: BinOp<T>,
	eq: (a: T, b: T) => boolean,
	config?: RunConfig,
) => {
	it("identity element: left", () => {
		fc.assert(
			fc.property(arb, (x) => eq(x, op(id, x))),
			config,
		);
	});

	it("identity element: right", () => {
		fc.assert(
			fc.property(arb, (x) => eq(x, op(x, id))),
			config,
		);
	});
};

export const propZero = <T>(
	it: It,
	arb: fc.Arbitrary<T>,
	zero: T,
	op: BinOp<T>,
	eq: (a: T, b: T) => boolean,
	config?: RunConfig,
) => {
	it("zero element: left", () => {
		fc.assert(
			fc.property(arb, (x) => eq(zero, op(zero, x))),
			config,
		);
	});

	it("zero element: right", () => {
		fc.assert(
			fc.property(arb, (x) => eq(zero, op(x, zero))),
			config,
		);
	});
};

export const propDist = <T>(
	it: It,
	arb: fc.Arbitrary<T>,
	add: BinOp<T>,
	mult: BinOp<T>,
	eq: (a: T, b: T) => boolean,
	config?: RunConfig,
) => {
	it("distributive: left", () => {
		fc.assert(
			fc.property(arb, arb, arb, (a, b, c) =>
				eq(mult(a, add(b, c)), add(mult(a, b), mult(a, c))),
			),
			config,
		);
	});

	it("distributive: right", () => {
		fc.assert(
			fc.property(arb, arb, arb, (a, b, c) =>
				eq(mult(add(b, c), a), add(mult(b, a), mult(c, a))),
			),
			config,
		);
	});
};
