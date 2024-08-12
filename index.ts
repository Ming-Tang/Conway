import { Conway, type Real } from "./conway";
import { mono, mono1 } from "./op";
import { isZero } from "./op/comparison";
import { canon, isLimit, isSucc, noSucc } from "./op/ordinal";
import { concat, cycleArray, fromArray } from "./seq";

const s1 = cycleArray([1, 2, 3]);
const s2 = fromArray([4, 5, 6]);
const s12 = concat(s1, s2);
console.log(`|s1| = ${s1.length}, |s2| = ${s2.length}, |s12| = ${s12.length}`);

console.log("---");

for (let i = 0; i < 10; i++) {
	console.log(s12.index(Conway.real(0)));
	console.log(s12.index(Conway.real(1)));
	console.log(s12.index(Conway.real(2)));
}
console.log("---");

for (let i = 0; i < 3; i++) {
	console.log(s12.index(Conway.real(i).add(Conway.unit)));
}

console.log("---");

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
console.log(`b(${q}) = ${Conway.birthday(q)}`);

const x0 = new Conway([
	[0, 1],
	[Conway.unit.neg(), 2],
	[Conway.unit.neg().add(Conway.real(-4)), 6],
]);
console.log(`b(${x0}) = ${Conway.birthday(x0)}`);

const x1 = new Conway([
	[0, 1],
	[Conway.unit.neg(), 2],
]);
console.log(`b(${x1}) = ${Conway.birthday(x1)}`);

const x2 = new Conway([
	[0, 4],
	[Conway.one.neg(), 6],
]);
console.log(`b(${x2}) = ${Conway.birthday(x2)}`);

const x3 = new Conway([
	[
		new Conway([
			[1, -1],
			[0, -1],
		]),
		1,
	],
	[Conway.one.neg(), 2],
]);
console.log(`b(${x3}) = ${Conway.birthday(x3)}`);

const ords = [
	Conway.unit,
	Conway.unit.mult(2n),
	Conway.unit.mult(2n).add(mono(4n, Conway.unit)),
	mono(4n, Conway.unit),
	mono1(Conway.unit),
	mono(2n, Conway.unit.add(2n))
		.add(mono(4n, Conway.unit.add(10n)))
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
