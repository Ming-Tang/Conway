import { realAdd } from "../../real";
import {
	type SignExpansionReader,
	compareSignExpansions,
	makeReader,
} from "../reader";
import {
	type Term,
	composeSignExpansion,
	decomposeSignExpansion,
} from "../reader/normalForm";
import { entriesEq } from "./eq";
import { neg } from "./neg";

export const addEntries = (terms1: Term[], terms2: Term[]): Term[] => {
	const res: Term[] = [...terms1];
	for (const [p1, c1] of terms2) {
		const found = res.find(([p]) => entriesEq(p, p1));
		if (!found) {
			res.push([p1, c1]);
			continue;
		}

		found[1] = realAdd(found[1], c1);
	}
	res.sort((a, b) => compareSignExpansions(makeReader(a[0]), makeReader(b[0])));
	return res;
};

export const add = (
	reader1: SignExpansionReader,
	reader2: SignExpansionReader,
) => {
	const entries1 = decomposeSignExpansion(reader1, true);
	const entries2 = decomposeSignExpansion(reader2, true);
	return composeSignExpansion(addEntries(entries1, entries2), true);
};

export const sub = (
	reader1: SignExpansionReader,
	reader2: SignExpansionReader,
) => add(reader1, makeReader([...neg(reader2)]));
