import type { Real } from "../../real";
import {
	type Entry,
	type SignExpansionReader,
	iterSignExpansionReader,
} from "../reader";
import { composeSignExpansion } from "../reader/normalForm";

export const mono1 = (reader: SignExpansionReader) => {
	const se: Entry[] = [...iterSignExpansionReader(reader)];
	return composeSignExpansion([[se, 1n]]);
};

export const mono = (coeff: Real, reader: SignExpansionReader) => {
	const se: Entry[] = [...iterSignExpansionReader(reader)];
	return composeSignExpansion([[se, coeff]]);
};
