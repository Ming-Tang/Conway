import {
	dyadicFromBigint,
	dyadicGe,
	dyadicGt,
	dyadicLe,
	dyadicLt,
	dyadicNeg,
} from ".";
import { Dyadic, dyadicNew } from "./class";

export const EPSILON_POWER = 8n;
export const EPSILON = Dyadic.create(1n, EPSILON_POWER);
export const LOW_THRESHOLDS = Array(Number(EPSILON_POWER + 1n))
	.fill(null)
	.map(
		(_, i) =>
			[BigInt(i), dyadicNew(1n, EPSILON_POWER - BigInt(i))] as [bigint, Dyadic],
	);
export const LOG_THRESHOLD = 32n;
export const LOG_THRESHOLD_DYADIC = dyadicFromBigint(LOG_THRESHOLD);

// Hash allocation
// 0: {0}
// 1: (0, 2^-k)
// 1 - k: [2^-k, 1)
// 1 - n:

export const dyadicOrdHash = (d: Dyadic): bigint => {
	if (d.isZero) {
		return 0n;
	}
	if (d.isNegative) {
		return -dyadicOrdHash(dyadicNeg(d));
	}

	if (dyadicLt(d, EPSILON)) {
		return 0n;
	}
	const ip = d.bigintQuotient;
	if (ip === 0n) {
		for (let i = LOW_THRESHOLDS.length - 1; i >= 0; i--) {
			const [h, th] = LOW_THRESHOLDS[i];
			if (dyadicGe(d, th)) {
				return h;
			}
		}
		return EPSILON_POWER;
	}

	if (dyadicGt(d, LOG_THRESHOLD_DYADIC)) {
		let l2 = 0n;
		let remain = ip;
		while (remain > 0n) {
			l2++;
			remain >>= 1n;
		}
		return LOG_THRESHOLD + l2 + 2n;
	}
	return EPSILON_POWER - 1n + ip;
};
