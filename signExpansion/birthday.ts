import { Conway, type Conway0, type Ord0 } from "../conway";
import { ordinalAdd } from "../op/ordinal";
import { realBirthday } from "../real";
import { signExpansionFromConway } from "./reader/normalForm";

export const conwayBirthday = (x: Conway) => {
	let sum: Ord0 = 0n;
	for (const { length } of signExpansionFromConway(x)) {
		sum = ordinalAdd(sum, length);
	}
	return sum;
};

/**
 * Determines the birthday of a surreal number.
 */
export const birthday = (value: Conway0) =>
	value instanceof Conway ? conwayBirthday(value) : realBirthday(value);
