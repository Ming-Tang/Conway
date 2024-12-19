import { INSTANCE_IMPLS, type Conway, type Ord0 } from "../conway";
import { ordinalAdd } from "../op/ordinal";
import { signExpansionFromConway } from "./reader/normalForm";

INSTANCE_IMPLS.birthday = (x: Conway) => {
	let sum: Ord0 = 0n;
	for (const { length } of signExpansionFromConway(x)) {
		sum = ordinalAdd(sum, length);
	}
	return sum;
};
