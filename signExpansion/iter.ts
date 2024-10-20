export type GroupByConsecutiveResult<T, State extends {}> =
	| { isGroup: false; value: T }
	| { isGroup: true; value: { state: State; items: T[] } };

export const groupByConsecutive = function* <T, State extends {}, R = void>(
	iter: Iterable<T>,
	getInitial: (item: T) => State | undefined,
	nextState: (state: State, item: T) => State | undefined,
): Generator<GroupByConsecutiveResult<T, State>, R> {
	const gen = iter[Symbol.iterator]();
	while (true) {
		const res = gen.next();
		if (res.done) {
			return res.value;
		}

		let state = getInitial(res.value);
		if (typeof state === "undefined") {
			yield { isGroup: false, value: res.value };
			continue;
		}

		const items: T[] = [res.value];
		while (true) {
			const res1 = gen.next();
			if (res1.done) {
				yield { isGroup: true, value: { state: state as State, items } };
				return res1.value;
			}
			items.push(res1.value);
			const state1 = nextState(state as State, res1.value);
			if (typeof state1 === "undefined") {
				yield { isGroup: true, value: { state: state as State, items } };
				break;
			}
			state = state1;
		}
	}
};
