import { Conway, type Conway0, type Ord0 } from "../conway";
import { ordinalAdd } from "../op/ordinal";
import { realBirthday } from "../real";
import { signExpansionFromConway } from "./reader/normalForm";

/**
 * Determines the birthday of this surreal number.
 */
Conway.prototype.birthday = function (this: Conway) {
	let sum: Ord0 = 0n;
	for (const { length } of signExpansionFromConway(this)) {
		sum = ordinalAdd(sum, length);
	}
	return sum;
};

export const birthday = (value: Conway0) =>
	value instanceof Conway ? value.birthday() : realBirthday(value);

declare module "../conway" {
	interface Conway<IsOrd extends boolean = boolean> {
		birthday(): Ord0;
	}
}
