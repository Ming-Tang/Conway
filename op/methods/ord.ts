import { ensure } from "..";
import { Conway, type Ord, type Ord0 } from "../../conway";
import {
	ordinalAddWrapped,
	ordinalDivRem,
	ordinalMultWrapped,
	ordinalPowWrapped,
	ordinalRightSubWrapped,
} from "../ordinal";

Conway.prototype.ordinalDivRem = function (this: Ord, d: Ord0): [Ord, Ord] {
	const [a, b] = ordinalDivRem(this, d);
	return [ensure(a) as Ord, ensure(b) as Ord];
};

Conway.prototype.ordinalPow = function (this: Ord, p: Ord0): Ord {
	return ordinalPowWrapped(this, p);
};

Conway.prototype.ordinalRightSub = function (this: Ord, other: Ord0) {
	return ordinalRightSubWrapped(this, other);
};

Conway.prototype.ordinalAdd = function (this: Ord, b: Ord0) {
	return ordinalAddWrapped(this, b);
};

Conway.prototype.ordinalMult = function (this: Ord, b: Ord0) {
	return ordinalMultWrapped(this, b);
};

declare module "../../conway" {
	interface Conway {
		ordinalDivRem(this: Ord, other: Ord0): [Ord, Ord];
		ordinalPow(this: Ord, other: Ord0): Ord;
		ordinalAdd(this: Ord, other: Ord0): Ord;
		ordinalMult(this: Ord, other: Ord0): Ord;
		ordinalRightSub(this: Ord, other: Ord0): Ord;
	}
}
