export type Real = number | bigint;

export const realZero: Real = 0n;
export const realOne: Real = 1n;

export const realIsZero = (value: Real): boolean => !value;

export const realNeg = (value: Real): Real => -value;

export const realAdd = (left: Real, right: Real): Real => {
	if (typeof left === "bigint" && typeof right === "bigint") {
		return left + right;
	}
	return Number(left) + Number(right);
};

export const realSub = (left: Real, right: Real): Real => {
	if (typeof left === "bigint" && typeof right === "bigint") {
		return left - right;
	}
	return Number(left) - Number(right);
};

export const realMult = (left: Real, right: Real): Real => {
	if (typeof left === "bigint" && typeof right === "bigint") {
		return left * right;
	}
	return Number(left) * Number(right);
};

export const realIntegerDiv = (left: Real, right: Real): Real => {
	if (typeof left === "bigint" && typeof right === "bigint") {
		return left / right;
	}
	return Math.floor(Number(left) / Number(right));
};

export const realIntegerPow = (left: Real, right: Real): Real => {
	if (typeof left === "bigint" && typeof right === "bigint") {
		return left ** right;
	}
	return Number(left) ** Number(right);
};
