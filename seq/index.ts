import { one, unit, zero } from "../op";
import { isZero } from "../op/comparison";
import {
	FromArray,
	Concat,
	LeftTruncate,
	CycleArray,
	Cycle,
	RepeatEach,
	Product,
	SeqMap,
	MapNatural,
	IndexByPower,
	OverrideIsConstant,
	Identity,
	Empty,
} from "./classes";
import type { Seq, Ord } from "./types";
export type { Seq, Ord } from "./types";

/**
 * Given an array, create a new transfinite sequence based on the array.
 * ```
 * fromArray(xs)[i] = xs[i]
 * |fromArray(xs)| = xs.length
 * ```
 */
export const fromArray = <T>(xs: T[]): Seq<T> => new FromArray(xs);

/**
 * Given two transfinite sequences `f` and `g`, create a new
 * transfinite sequence by joining them in sequence.
 * Notation: `f & g`
 * ```
 * (f & g)[i] = f[i] if i < |f|
 * (f & g)[i] = g[i - |f|] if |f| <= i < |f| + |g|
 * |f & g| = |f| + |g|
 * ```
 */
export const concat = <T>(f: Seq<T>, g: Seq<T>): Seq<T> => new Concat(f, g);

/**
 * Given a sequence `f`, create a new sequence without forst `trunc` elements.
 * ```
 * leftTrunc(n, f)[i] = f[n + i]
 * |leftTrunc(n, f)| = |f| - n
 * ```
 * @param trunc The length to truncate
 */
export const leftTrunc = <T>(trunc: Ord, f: Seq<T>): Seq<T> =>
	new LeftTruncate(trunc, f);

// TODO rightTrunc

/**
 * Given an array, create a new transfinite sequence that repeats it
 * `n` times.
 * ```
 * |cycleArray(xs, n)| = xs.length n
 * ```
 * @param xs The array to repeat
 * @param n The number of repetitions
 */
export const cycleArray = <T>(xs: T[], n = unit): Seq<T> =>
	new CycleArray(xs, n);

/**
 * Given a sequence `f`, repeat it `n` times.
 *
 * ```
 * cycle(f, 0) = empty
 * cycle(f, n+1) = f & cycle(f, n)
 * cycle(f, limit n) = lim (i -> cycle(f, n(i)))
 * |cycle(f, n)| = |f| n
 * ```
 */
export const cycle = <T>(f: Seq<T>, n = one): Seq<T> => new Cycle(f, n);

/**
 * For each element, repeat it `n` times.
 * ```
 * repeatEach(empty, n) = empty
 * repeatEach(cons(f, x), n) = repeatEach(x) & cycleArray(x, n)
 * repeatEach(lim f, n) = lim (i -> repeatEach(f(i), n))
 * |repeatEach(f, n)| = n |f|
 * ```
 */
export const repeatEach = <T>(f: Seq<T>, n = unit): Seq<T> =>
	new RepeatEach(f, n);

/**
 * Constructs the Cartesian product between two transfinite sequences `f` and `g`.
 * ```
 * |prod(f, g)| = |f| |g|
 * prod[|g| j + i] = (f[i], g[j]) where i < |g|
 * ```
 */
export const prod = <A, B>(f: Seq<A>, g: Seq<B>): Seq<[A, B]> =>
	new Product(f, g);

/**
 * Constructs a transfinite sequence that applies a function on the
 * original element at the given index.
 * ```
 * |map(f, func)| = |f|
 * map(f, func)[i] = func(f[i])
 * ```
 */
export const map = <A, B>(f: Seq<A>, func: (value: A) => B): Seq<B> =>
	new SeqMap(f, func);

/**
 * Constructs a transfinite sequence with elements based on a function from a `bigint`.
 * ```
 * mapNatural(f, n)[i] = f(i)
 * ```
 * @param length Length of the sequence, must be a finite ordinal or `unit`
 */
export const mapNatural = <T>(
	func: (value: bigint) => T,
	length = unit as Ord,
) => new MapNatural<T>(func, length);

/**
 * Given a transfinite sequence `f`, construct a transfinite sequence that indexes `f`
 * based on the exponent of the leading power of the index.
 * ```
 * indexByPower(f)[w^p0 c0 + ...] = f[p0]
 * |indexByPower(f)| = w^|f|
 * ```
 */
export const indexByPower = <T>(f: Seq<T>): Seq<T> => new IndexByPower(f);

/**
 * If the sequence is constant (`isConstant`), return `empty`
 * or a `cycleArray(...)` instead.
 * Otherwise return the sequence itself.
 */
export const maybeSimplifyConst = <T>(f: Seq<T>): Seq<T> => {
	if (isZero(f.length)) {
		return empty as Seq<T>;
	}
	if (f.isConstant) {
		return cycleArray([f.index(zero)], f.length);
	}
	return f;
};

/**
 * Override `isConstant` property for a particular sequence.
 *
 * If the second argument is true, create a sequence based on the first argument
 * except with `isConstant` being true.
 * Otherwise, return the first argument.
 * @param seq The sequence to override `isConstant`.
 * @param isConstant Should override the `isConstant` flag
 * @returns
 */
export const maybeOverrideIsConstant = <T, S extends Seq<T> = Seq<T>>(
	seq: S,
	isConstant = true,
) => (isConstant ? new OverrideIsConstant<T, S>(seq, true) : seq);

/**
 * Constructs a transfinite sequence that indexes to the index itself.
 * ```
 * identity(n)[i] = i
 * ```
 * @param length Length of the sequence.
 * @returns
 */
export const identity = (length: Ord) => new Identity(length);

/**
 * The empty transfinite sequence with `unknown` as the type parameter.
 * You can safely cast the type parameter.
 * ```
 * const empty1 = empty as Seq<T>;
 * ```
 */
export const empty = Empty.instance;

export const isEmpty = <T>(f: Seq<T>) => f === empty || isZero(f.length);
