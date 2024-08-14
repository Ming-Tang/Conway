import { Conway } from "./conway";
import type { Real } from "./real";
import { birthday, mono, mono1, one, unit, fromReal as real } from "./op";
import { isZero } from "./op/comparison";
import { canon, isLimit, isSucc, noSucc } from "./op/ordinal";
import { concat, cycleArray, fromArray } from "./seq";
import { signExpansion } from "./signExpansion";

const s1 = cycleArray([1, 2, 3]);
const s2 = fromArray([4, 5, 6]);
const s12 = concat(s1, s2);
console.log(`|s1| = ${s1.length}, |s2| = ${s2.length}, |s12| = ${s12.length}`);

const a = new Conway([[0, 1]]);
const b = new Conway([
	[1, 1],
	[0, 1],
]);
const [q] = a.divRemIters(b, 10);
console.log(`a = ${a}`);
console.log(`b = ${b}`);
console.log(`a/b = ${q}`);
console.log(`b(${a}) = ${a.birthday()}`);
console.log(`b(${b}) = ${b.birthday()}`);
console.log(`b(${q}) = ${birthday(q)}`);

const x0 = new Conway([
	[0, 1],
	[unit.neg(), 2],
	[unit.neg().add(real(-4)), 6],
]);
console.log(`b(${x0}) = ${birthday(x0)}`);

const x1 = new Conway([
	[0, 1],
	[unit.neg(), 2],
]);
console.log(`b(${x1}) = ${birthday(x1)}`);

const x2 = new Conway([
	[0, 4],
	[one.neg(), 6],
]);
console.log(`b(${x2}) = ${birthday(x2)}`);

const x3 = new Conway([
	[
		new Conway([
			[1, -1],
			[0, -1],
		]),
		1,
	],
	[one.neg(), 2],
]);

for (const x of [x0, x1, x2, x3]) {
	console.log(`b(${x}) = ${birthday(x)}`);
	console.log(`SE(${x}) =`, signExpansion(x));
	console.log("");
}

// biome-ignore lint/correctness/noConstantCondition: <explanation>
if (false) {
	const ords = [
		unit,
		unit.mult(2n),
		unit.mult(2n).add(mono(4n, unit)),
		mono(4n, unit),
		mono1(unit),
		mono(2n, unit.add(2n))
			.add(mono(4n, unit.add(10n)))
			.add(mono(2n, 1)),
	];

	const countback = (ord: Real | Conway, n: number) => {
		let x: Real | Conway = ord;
		while (true) {
			if (isSucc(x)) {
				x = noSucc(x);
			}
			if (isZero(x) || !(x instanceof Conway)) {
				break;
			}
			console.log("...");
			for (let i = n; i > 0; i--) {
				console.log(`${canon(x, i)}`);
			}
			if (!isLimit(x)) {
				break;
			}
			x = canon(x, 1);
		}
	};

	for (const ord of ords) {
		console.log(`canon(${ord}) = [`);
		Array(5)
			.fill(null)
			.forEach((_, i) => console.log("  ", canon(ord, i)));
		console.log("]");

		countback(ord, 5);
	}

	console.log(unit.add(1).ordinalPow(4n));
	console.log(mono(4n, 6n).add(1n).ordinalPow(10n));
	console.log(mono(4n, 6n).add(mono(3n, 3n)).add(1n).ordinalPow(10n));
	console.log(
		mono(2n, unit).add(mono(4n, 6n)).add(mono(3n, 3n)).add(1n).ordinalPow(10n),
	);
	console.log(
		mono(2n, unit).add(mono(4n, 6n)).add(mono(3n, 3n)).ordinalPow(10n),
	);
}
