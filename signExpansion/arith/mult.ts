import { realAdd, realMult } from "../../real";
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
import { add } from "./add";
import { entriesEq } from "./eq";

export const multEntries = (terms1: Term[], terms2: Term[]): Term[] => {
	const res: Term[] = [];
	for (const [p1, c1] of terms1) {
		for (const [p2, c2] of terms2) {
			const p12 = [...add(makeReader(p1), makeReader(p2))];
			const newTerm: Term = [p12, realMult(c1, c2)];
			const found = res.find(([p]) => entriesEq(p, p12));
			if (!found) {
				res.push(newTerm);
				continue;
			}

			found[1] = realAdd(found[1], newTerm[1]);
		}
	}
	res.sort((a, b) => compareSignExpansions(makeReader(a[0]), makeReader(b[0])));
	return res;
};

export const mult = (
	reader1: SignExpansionReader,
	reader2: SignExpansionReader,
) => {
	const entries1 = decomposeSignExpansion(reader1, true);
	const entries2 = decomposeSignExpansion(reader2, true);
	return composeSignExpansion(multEntries(entries1, entries2), true);
};
