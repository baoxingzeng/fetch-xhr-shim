import { Headers, createHeaders } from "./HeadersP";
import { BodyImpl, initBody, Payload } from "./BodyImpl";
import { AbortController } from "../event-system/AbortControllerP";
import { isEventTarget } from "../event-system/EventTargetP";
import { _Symbol, setState, isPolyfillType, checkArgsLength } from "../utils";

export class RequestP extends BodyImpl implements Request {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
        checkArgsLength(arguments.length, 1, "Request");
        super();
        setState(this, "__Request__", new RequestState());
        const s = state(this);

        let _init = init ?? {};
        if (typeof _init !== "object") {
            throw new TypeError("Failed to construct 'Request': The provided value is not of type 'RequestInit'.");
        }

        let body = _init.body;
        let bodyInited = false;

        if (isRequest(input)) {
            if (input.bodyUsed) {
                throw new TypeError("Failed to construct 'Request': Cannot construct a Request with a Request object that has already been used.");
            }

            s.cache = input.cache;
            s.credentials = input.credentials;
            if (_init.headers === undefined) { state(this).headers = createHeaders(input.headers); }
            s.method = input.method;
            s.mode = input.mode;
            s.signal = input.signal;
            s.url = input.url;

            if (!body) {
                this.__Body__.payload = createPhonyPayload(input);
                bodyInited = true;
            }
        } else {
            s.url = "" + input;
        }

        if (_init.cache) { s.cache = _init.cache; }
        if (_init.credentials) { s.credentials = _init.credentials; }
        if (_init.headers !== undefined) { state(this).headers = createHeaders(_init.headers); }
        if (_init.method) { s.method = normalizeMethod(_init.method); }
        if (_init.mode) { s.mode = _init.mode; }
        if (_init.signal !== null && _init.signal !== undefined) {
            if (isEventTarget(_init.signal)) s.signal = _init.signal;
            else throw new TypeError("Failed to construct 'Request': Failed to read the 'signal' property from 'RequestInit': Failed to convert value to 'AbortSignal'.");
        }

        if (this.method === "GET" || this.method === "HEAD") {
            if (body !== null && body !== undefined) {
                throw new TypeError("Failed to construct 'Request': Request with GET/HEAD method cannot have body.");
            }
        }

        initBody(this, bodyInited ? null : body);
        let payload = this.__Body__.payload;

        if (!this.headers.has("Content-Type") && payload && payload.type) {
            this.headers.set("Content-Type", payload.type);
        }

        if (this.method === "GET" || this.method === "HEAD") {
            if (this.cache === "no-cache" || this.cache === "no-store") {
                clearCache(this);
            }
        }
    }

    /** @internal */ declare readonly __Request__: RequestState;

    get cache(): RequestCache { return state(this).cache; }
    get credentials(): RequestCredentials { return state(this).credentials; }
    get destination(): RequestDestination { return ""; }
    get headers(): Headers {
        if (!state(this).headers) { state(this).headers = new Headers(); }
        return state(this).headers!;
    }
    get integrity(): string { return ""; }
    get keepalive(): boolean { return false; }
    get method(): string { return state(this).method; }
    get mode(): RequestMode { return state(this).mode; }
    get redirect(): RequestRedirect { return "follow"; }
    get referrer(): string { return state(this).referrer; }
    get referrerPolicy(): ReferrerPolicy { return ""; }
    get signal(): AbortSignal {
        if (!state(this).signal) { state(this).signal = (new AbortController()).signal; }
        return state(this).signal!;
    }
    get url(): string { return state(this).url; }

    clone(): Request {
        if (!this.bodyUsed) { let req = new RequestP(this); this.__Body__.bodyUsed = false; return req; }
        else { throw new TypeError("Failed to execute 'clone' on 'Request': Request body is already used"); }
    }

    /** @internal */ toString() { return "[object Request]"; }
    /** @internal */ get [_Symbol.toStringTag]() { return "Request"; }
    /** @internal */ get __MPHTTPX__() { return { chain: ["Request", "Body"] }; }
}

/** @internal */
class RequestState {
    cache: RequestCache = "default";
    credentials: RequestCredentials = "same-origin";
    headers?: Headers;
    method: string = "GET";
    mode: RequestMode = "cors";
    referrer: string = "about:client";
    signal?: AbortSignal;
    url: string = "";
}

function state(target: RequestP) {
    return target.__Request__;
}

function isRequest(value: unknown): value is Request {
    return isPolyfillType<Request>("Request", value) || isExternalRequest(value);
}

function isExternalRequest(value: unknown): value is Request {
    let expect = "[object Request]";
    return (Object.prototype.toString.call(value) === expect || String(value) === expect)
        && !!value
        && typeof value === "object"
        && "arrayBuffer" in (value as object)
        && typeof (value as (object & Record<"arrayBuffer", unknown>)).arrayBuffer === "function";
}

export function createPhonyPayload(request: Request): Payload {
    let payload = Object.create(Payload.prototype) as Payload;
    payload.type = request.headers.get("Content-Type") || "";

    try {
        payload.promise = request.arrayBuffer();
    } catch (e) {
        try {
            payload.promise = request.text();
        } catch (e) {
            if (payload.type.slice(0, 19).toLowerCase() === "multipart/form-data") {
                try {
                    payload.promise = request.formData().then(function (r: FormData) { return (new Payload(r, payload.type)).promise; });
                } catch (e) {
                    // pass
                }
            }
        }
    }

    if (!payload.promise) {
        throw new TypeError("Failed to construct 'Request': Failed to read request body data, underlying data is in an invalid format.");
    }

    return payload;
}

function clearCache(req: RequestP) {
    // Search for a '_' parameter in the query string
    let reParamSearch = /([?&])_=[^&]*/;
    if (reParamSearch.test(req.url)) {
        // If it already exists then set the value with the current time
        state(req).url = req.url.replace(reParamSearch, "$1_=" + (new Date()).getTime());
    } else {
        // Otherwise add a new '_' parameter to the end with the current time
        let reQueryString = /\?/;
        state(req).url += (reQueryString.test(req.url) ? "&" : "?") + "_=" + (new Date()).getTime();
    }
}

// HTTP methods whose capitalization should be normalized
const methods = ["CONNECT", "DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT", "TRACE"];

export function normalizeMethod(method: string) {
    let upcased = method.toUpperCase();
    return methods.indexOf(upcased) > -1 ? upcased : method;
}

const RequestE = (typeof Request !== "undefined" && Request) || RequestP;
export { RequestE as Request };
