import type { Ord0 } from "../../conway";
import { type Entry, commonPrefix, makeReader } from "../reader";

export const entriesEq = <O extends Ord0 = Ord0>(
	p1: Entry<O>[],
	p2: Entry<O>[],
): boolean => {
	if (p1 === p2) {
		return true;
	}
	const it = commonPrefix(makeReader(p1), makeReader(p2))[Symbol.iterator]();
	while (true) {
		const res = it.next();
		if (res.done) {
			return res.value === 0;
		}
	}
	throw new Error("unreachable");
};
