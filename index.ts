import { mono, unit } from "./op";
import { signExpansion, signExpansionOmit } from "./signExpansion/gonshor";
import {
	commonPrefix,
	normalizeSignExpansionSeq,
} from "./signExpansion/normalize";

// const a = mono(-1, unit); // -w^w
// const b = mono(-2.5, 1); // -2.5w
const a = mono(-2.5, 1).sub(mono(1, 0.5)); // -2.5w - 5
const b = mono(-2.5, 1); // -2.5w
for (const x of [a, b]) {
	console.log(`SE(${x})`, [...signExpansion(x)]);
	console.log(`NSE(${x})`, [...normalizeSignExpansionSeq(signExpansion(x))]);
}

console.log(`CP(${a}, ${b})`, [
	...commonPrefix(
		normalizeSignExpansionSeq(signExpansion(a)),
		normalizeSignExpansionSeq(signExpansion(b)),
	),
]);

console.log(`${a} | ${b}`, [...signExpansionOmit(a, [b])]);
