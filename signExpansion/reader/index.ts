import type { Ord0 } from "../../conway";
import { type Entry, IterReader } from "./types";

export type {
	Entry,
	SignExpansionReader,
} from "./types";

export {
	groupBySign,
	IterReader,
	iterSignExpansionReader,
} from "./types";

export { signExpansionFromConway, conwayFromSignExpansion } from "./normalForm";

export {
	countSigns,
	compareSign,
	commonPrefix,
	compareSignExpansions,
	index,
	findIndexToSign,
	truncate,
} from "./split";

export const makeReader = <O extends Ord0 = Ord0>(x: Iterable<Entry<O>>) => {
	return new IterReader(x);
};
