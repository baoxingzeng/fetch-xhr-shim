import { _Symbol, setState, safeString, isPolyfillType, isSequence, makeIterator, checkArgsLength } from "../utils";

export class HeadersP implements Headers {
    constructor(init?: HeadersInit) {
        setState(this, "__Headers__", new HeadersState());

        if (init !== undefined) {
            if (isHeaders(init)) {
                init.forEach((function (this: HeadersP, value: string, name: string) { Headers_append(this, name, value, ""); }).bind(this), this);
            }

            else if (isSequence(init)) {
                let _init = Array.isArray(init) ? init : Array.from<[string, string]>(init);
                for (let i = 0; i < _init.length; ++i) {
                    let item = _init[i]!;
                    if (isSequence(item)) {
                        let pair = Array.isArray(item) ? item : Array.from<string>(item) as [string, string];
                        if (pair.length === 2) {
                            Headers_append(this, pair[0], pair[1]);
                        } else {
                            throw new TypeError("Failed to construct 'Headers': Invalid value");
                        }
                    } else {
                        throw new TypeError("Failed to construct 'Headers': The provided value cannot be converted to a sequence.");
                    }
                }
            }

            else {
                if (init && typeof init === "object") {
                    Object.getOwnPropertyNames(init).forEach((function (this: HeadersP, name: string) { Headers_append(this, name, init[name]!); }).bind(this), this);
                } else {
                    throw new TypeError("Failed to construct 'Headers': The provided value is not of type '(record<ByteString, ByteString> or sequence<sequence<ByteString>>)'.");
                }
            }
        }
    }

    /** @internal */ declare readonly __Headers__: HeadersState;

    append(name: string, value: string): void {
        checkArgsFn(arguments.length, 2, "append");
        Headers_append(this, name, value, "append");
    }

    ["delete"](name: string): void {
        checkArgsFn(arguments.length, 1, "delete");
        delete state(this).dict[normalizeName(name, throwsFn("delete"))];
    }

    get(name: string): string | null {
        checkArgsFn(arguments.length, 1, "get");
        return state(this).dict[normalizeName(name, throwsFn("get"))] ?? null;
    }

    getSetCookie(): string[] {
        let value = this.get("Set-Cookie");
        return value ? value.split(", ") : [];
    }

    has(name: string): boolean {
        checkArgsFn(arguments.length, 1, "has");
        return state(this).dict.hasOwnProperty(normalizeName(name, throwsFn("has")));
    }

    set(name: string, value: string): void {
        checkArgsFn(arguments.length, 2, "set");
        state(this).dict[normalizeName(name, throwsFn("set"))] = normalizeValue(value);
    }

    forEach(callbackfn: (value: string, key: string, parent: Headers) => void, thisArg?: any): void {
        checkArgsFn(arguments.length, 1, "forEach");
        if (typeof callbackfn !== "function") {
            throw new TypeError("Failed to execute 'forEach' on 'Headers': parameter 1 is not of type 'Function'.");
        }
        let dict = state(this).dict;
        let names = Object.getOwnPropertyNames(dict);
        for (let i = 0; i < names.length; ++i) {
            let name = names[i]!;
            callbackfn.call(thisArg, dict[name]!, name, this);
        }
    }

    entries(): HeadersIterator<[string, string]> {
        let array: [string, string][] = [];
        this.forEach(function (value, name) { array.push([name, value]); });
        return makeIterator(array);
    }

    keys(): HeadersIterator<string> {
        let array: [string, string][] = [];
        this.forEach(function (value, name) { array.push([name, value]); });
        return makeIterator(array.map(function (x) { return x[0]; }));
    }

    values(): HeadersIterator<string> {
        let array: [string, string][] = [];
        this.forEach(function (value, name) { array.push([name, value]); });
        return makeIterator(array.map(function (x) { return x[1]; }));
    }

    declare [Symbol.iterator]: () => HeadersIterator<[string, string]>;

    // @ts-ignore
    /** @internal */[_Symbol.iterator](): HeadersIterator<[string, string]> {
        return this.entries();
    }

    /** @internal */ toString() { return "[object Headers]"; }
    /** @internal */ get [_Symbol.toStringTag]() { return "Headers"; }
    /** @internal */ get __MPHTTPX__() { return { chain: ["Headers"] }; }
}

/** @internal */
class HeadersState {
    dict: Record<string, string> = {};
}

function state(target: HeadersP) {
    return target.__Headers__;
}

function Headers_append(headers: HeadersP, name: string, value: string, kind = "constructor") {
    let _name = normalizeName(name, kind ? throwsFn(kind) : undefined);
    let _value = normalizeValue(value);
    let dict = state(headers).dict;
    let oldValue = dict[_name];
    dict[_name] = oldValue !== undefined ? `${oldValue}, ${_value}` : _value;
}

function throwsFn(kind: string) {
    return function () {
        throw new TypeError(`Failed to ${(kind && kind !== "constructor") ? ("execute '" + kind + "' on") : "construct"} 'Headers': Invalid name`);
    };
}

function checkArgsFn(actual: number, expect: number, funcName: string) {
    checkArgsLength(actual, expect, "Headers", funcName);
}

export function isHeaders(value: unknown): value is Headers {
    return isPolyfillType<Headers>("Headers", value) || isExternalHeaders(value);
}

function isExternalHeaders(value: unknown): value is Headers {
    let expect = "[object Headers]";
    return !!value
        && typeof value === "object"
        && "forEach" in (value as object)
        && typeof (value as (object & Record<"forEach", unknown>)).forEach === "function"
        && (Object.prototype.toString.call(value) === expect || safeString(value) === expect);
}

export function normalizeName(name: string, throwError?: () => never) {
    if (typeof name !== "string") { name = "" + name; }
    if (throwError && (/[^a-z0-9\-#$%&'*+.^_`|~!]/i.test(name) || name === "")) {
        throwError();
    }
    return name.toLowerCase();
}

export function normalizeValue(value: string) {
    return typeof value === "string" ? value : ("" + value);
}

export function parseHeaders(rawHeaders: string): Headers {
    let headers = new HeadersE();
    let preProcessedHeaders = rawHeaders.replace(/\r?\n[\t ]+/g, " ");

    preProcessedHeaders
        .split("\r")
        .map(function (header) { return header.indexOf("\n") === 0 ? header.substring(1, header.length) : header; })
        .forEach(function (line) {
            let parts = line.split(":");
            let name = parts.shift()!.trim();
            if (name) {
                let value = parts.join(":").trim();
                try {
                    headers.append(name, value);
                } catch (e) {
                    console.warn(`SyntaxError: Response.headers: '${name}' is not a valid HTTP header field name.`);
                }
            }
        });

    return headers;
}

export function createHeaders(headers?: HeadersInit): Headers {
    if (isPolyfillType<Headers>("Headers", headers)) {
        if (HeadersE !== HeadersP) {
            let _headers = new HeadersE();
            headers.forEach(function (v: string, k: string) { _headers.append(k, v); });
            return _headers;
        }
    }
    return new HeadersE(headers);
}

const HeadersE = (typeof Headers !== "undefined" && Headers) || HeadersP;
export { HeadersE as Headers };
