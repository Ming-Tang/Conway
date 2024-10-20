import { expect } from "bun:test";
import { eq } from "../op/comparison";
import type { Conway0 } from "../conway";
import { isConway0 } from "../op";

expect.extend({
	byToString(received: unknown, other: unknown) {
		const receivedString =
			typeof received === "string" ? received : `${received}`;
		const otherString = typeof other === "string" ? other : `${other}`;
		if (receivedString === other) {
			return {
				message: () =>
					`expected ${received} not to have toString() of ${JSON.stringify(otherString)}`,
				pass: true,
			};
		}
		return {
			message: () =>
				`expected ${received} to have toString() of ${JSON.stringify(otherString)}`,
			pass: false,
		};
	},
	conwayEq(received: unknown, other: unknown) {
		if (!isConway0(received)) {
			throw new TypeError("received must be Conway0");
		}
		if (!isConway0(other)) {
			throw new TypeError("other must be Conway0");
		}
		if (eq(received as Conway0, other as Conway0)) {
			return {
				message: () => `expected ${received} not to be Conway.eq ${other}`,
				pass: true,
			};
		}
		return {
			message: () => `expected ${received} not to be Conway.eq ${other}`,
			pass: false,
		};
	},
});

declare global {
	namespace jest {
		interface Matchers<R> {
			byToString(other: string | unknown): R;
			conwayEq(other: Conway0): R;
		}

		interface Expect {
			byToString(other: string | unknown): unknown;
			conwayEq(other: Conway0): unknown;
		}
	}
}
