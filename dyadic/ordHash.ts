import { dyadicIsZero, dyadicLt, dyadicNeg, dyadicOne, dyadicSub } from ".";
import { dyadicLog2, dyadicPow2 } from "./arith";
import { type Dyadic, dyadicNew } from "./class";

/**
 * Returns as dyadic order-preserving hashing function
 * from `Dyadic` to non-negative `bigint`.
 * There are 4 pieces of the hash function:
 * 1. `(-inf, 2^-pLow)`: zero
 * 2. `[2^-pLow, 1)`: log scaling
 * 3. `[1, 2^pHigh)`: linear scaling with slope of 1
 * 4. `[2^pHigh, inf)`: log scaling
 */
export const makeOrdHash = (pLow: bigint, pHigh: bigint) => {
	const xLow = dyadicPow2(-pLow);
	const xHigh = dyadicPow2(pHigh);
	const base = pLow - 1n;
	const base1 = base - pHigh + xHigh.bigintQuotient;
	return (x: Dyadic): bigint => {
		if (dyadicIsZero(x) || dyadicLt(x, xLow)) {
			return 0n;
		}

		if (dyadicLt(x, dyadicOne)) {
			return base + 1n + dyadicLog2(x);
		}

		if (dyadicLt(x, xHigh)) {
			return base + x.bigintQuotient;
		}

		return base1 + dyadicLog2(x);
	};
};

const P_LOW = 32n;
const P_HIGH = 16n;
export const ORD_HASH_EPSILON = /*#__PURE__*/ dyadicNew(3n, P_LOW + 1n);
const ordHashFunc = /*#__PURE__*/ makeOrdHash(P_LOW, P_HIGH);

export const dyadicOrdHash = (d: Dyadic): bigint => {
	if (d.isZero) {
		return 0n;
	}
	if (d.isNegative) {
		return -ordHashFunc(dyadicNeg(d));
	}
	return ordHashFunc(d);
};
