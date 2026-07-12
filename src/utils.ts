// Safe fallback for Symbol.iterator and Symbol.toStringTag — uses native Symbol when available, string keys otherwise.
export const _Symbol = {
    iterator: ((typeof Symbol === "function" && Symbol.iterator) || "Symbol(Symbol.iterator)" as never) as typeof Symbol.iterator,
    toStringTag: ((typeof Symbol === "function" && Symbol.toStringTag) || "Symbol(Symbol.toStringTag)" as never) as typeof Symbol.toStringTag,
};

export class DOMExceptionP extends Error {
    constructor(message?: string, name?: string) {
        super(message);
        if (name !== undefined) this.name = "" + name;
    }
    /** @internal */ get [_Symbol.toStringTag]() { return "DOMException"; }
    /** @internal */ get __MPHTTPX__() { return { chain: ["DOMException"] }; }
}

const DOMExceptionE = (function () { try { new DOMException(); return true; } catch (e) { return false; } })() ? DOMException : DOMExceptionP as never;
export { DOMExceptionE as DOMException };

export function className(object: { __MPHTTPX__: { chain: string[] } }): string {
    try { return object.__MPHTTPX__.chain[0]!; } catch (e) { return Object.prototype.toString.call(object).slice(8, -1); }
}

export function setState<T extends object, K extends keyof T>(target: T, name: K, value: T[K]) {
    Object.defineProperty(target, name, { value });
}

export function isObjectType<T>(name: string, value: unknown): value is T {
    return Object.prototype.toString.call(value) === `[object ${name}]`;
}

export function isPolyfillType<T>(name: string, value: unknown, strict = false): value is T {
    const field = "__MPHTTPX__";
    type THasField = object & Record<typeof field, unknown>;
    type TFieldIsObject = object & Record<typeof field, object>;
    type THasChain = object & Record<typeof field, object & Record<"chain", unknown>>;
    type TChainIsArray = object & Record<typeof field, object & Record<"chain", Array<unknown>>>;

    return !!value
        && typeof value === "object"
        && field in value
        && !!(value as THasField)[field]
        && typeof (value as THasField)[field] === "object"
        && "chain" in (value as TFieldIsObject)[field]
        && Array.isArray((value as THasChain)[field].chain)
        && (function (index: number) { return strict ? index === 0 : index > -1; })((value as TChainIsArray)[field].chain.indexOf(name));
}

const iteratorSupported = typeof Symbol === "function" && !!Symbol.iterator;
export function isSequence(value: unknown): value is any[] {
    return Array.isArray(value) || (!!value
        && typeof value === "object"
        && iteratorSupported
        && Symbol.iterator in value
        && typeof (value as (object & Record<typeof Symbol.iterator, unknown>))[Symbol.iterator] === "function");
}

export function makeIterator<T>(array: T[]): IterableIterator<T> {
    let index = 0;
    let iterator: IterableIterator<T> = {
        next: function (): IteratorResult<T> {
            if (index < array.length) {
                return { value: array[index++]!, done: false };
            }
            return { value: undefined as any, done: true };
        },
        [_Symbol.iterator]: function (): IterableIterator<T> { return iterator; },
    };
    return iterator;
}

export function checkArgsLength(actual: number, expect: number, className: string, funcName?: string) {
    if (actual < expect) {
        throw new TypeError(`Failed to ${funcName ? ("execute '" + funcName + "' on") : "construct"} '${className}': ${expect} argument${expect > 1 ? "s" : ""} required, but only ${actual} present.`);
    }
}
