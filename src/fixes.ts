import { fetchP } from "./fetch-api/fetchP";
import { Payload } from "./fetch-api/BodyImpl";
import { createPhonyPayload } from "./fetch-api/RequestP";
import { isBlob } from "./file-system/BlobP";
import { isURLSearchParams } from "./network/URLSearchParamsP";
import { isFormData, FormData_toBlob } from "./network/FormDataP";
import { isEventTarget } from "./event-system/EventTargetP";
import { DOMException, setState, isPolyfillType, isSequence } from "./utils";

const fullOverride = { value: false };
export function setFullOverride(value: boolean) { fullOverride.value = !!value; }

export function fixFetch(fetchFunc?: typeof fetch): typeof fetch {
    const fetchFn = fetchFunc as typeof fetch || (typeof fetch !== "undefined" && fetch);
    if (!fetchFn || fetchFn === fetchP) return fetchP;
    if ("__MPHTTPX__Polyfill__" in fetchFn) return fetchFn as typeof fetch;

    function isHeadersLike(value: unknown): value is Headers {
        return !!value
            && typeof value === "object"
            && "has" in value
            && typeof value.has === "function"
            && "set" in value
            && typeof value.set === "function";
    }

    function setContentType(init: RequestInit, contentType: string) {
        if (init.headers) {
            if (isHeadersLike(init.headers)) {
                if (!init.headers.has("Content-Type")) {
                    init.headers.set("Content-Type", contentType);
                }
            } else if (isSequence(init.headers)) {
                let hasContentType = false;
                let _headers = Array.isArray(init.headers) ? init.headers : Array.from<[string, string]>(init.headers);

                for (let i = 0; i < _headers.length; ++i) {
                    let header = _headers[i]!;
                    if (isSequence(header)) {
                        let pair = Array.isArray(header) ? header : Array.from<string>(header) as [string, string];
                        if (pair.length >= 2 && String(pair[0]).toLowerCase() === "content-type") {
                            hasContentType = true;
                            break;
                        }
                    }
                }

                if (!hasContentType) {
                    _headers.push(["Content-Type", contentType]);
                    init.headers = _headers;
                }
            } else {
                if (typeof init.headers === "object") {
                    let hasContentType = false;
                    let names = Object.getOwnPropertyNames(init.headers);

                    for (let i = 0; i < names.length; ++i) {
                        let name = names[i]!;
                        if (name.toLowerCase() === "content-type") {
                            hasContentType = true;
                            break;
                        }
                    }

                    if (!hasContentType) {
                        init.headers["Content-Type"] = contentType;
                    }
                }
            }
        } else {
            init.headers = { "Content-Type": contentType };
        }
    }

    function _fetch(this: typeof globalThis, input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
        if (isPolyfillType<Request>("Request", input)) {
            let _input = input as Request;
            let _init = init || {};

            if (!_init.method) { _init.method = _input.method; }
            if (!_init.headers) { _init.headers = _input.headers; }
            if (!_init.mode) { _init.mode = _input.mode; }
            if (!_init.cache) { _init.cache = _input.cache; }
            if (!_init.credentials) { _init.credentials = _input.credentials; }

            // @ts-ignore RequestP-AbortSignal
            if (!_init.signal && _input.__Request__.signal) {
                _init.signal = _input.signal;
            }

            if (!_init.body) {
                // RequestP-PhonyPayload
                _init.body = createPhonyPayload(_input) as never;
            }

            input = _input.url;
            init = _init;
        }

        if (init && init.headers && isPolyfillType<Headers>("Headers", init.headers)) {
            if (typeof Headers !== "undefined" && Headers && !("__MPHTTPX__" in Headers.prototype)) {
                let headers = new Headers();
                init.headers.forEach(function (value: string, name: string) { headers.append(name, value); });
                init.headers = headers;
            } else {
                let headers: Record<string, string> = {};
                init.headers.forEach(function (value: string, name: string) { headers[name] = value; });
                init.headers = headers;
            }
        }

        return new Promise((function (this: typeof globalThis, resolve: (v: Response | PromiseLike<Response>) => void, reject: (e: Error) => void) {
            if (init && init.body && (fullOverride.value ? isFormData(init.body) : isPolyfillType<FormData>("FormData", init.body))) {
                init.body = FormData_toBlob(init.body as FormData);
            }

            let payload = init && init.body && (
                ((fullOverride.value ? isBlob(init.body) : isPolyfillType<Blob>("Blob", init.body)) && new Payload(init.body as Blob)) ||
                (Payload.prototype.isPrototypeOf(init.body) && init.body as never)  // RequestP-PhonyPayload
            );

            if (payload) {
                if (payload.type) {
                    setContentType(init!, payload.type);
                }

                let removeFn: (() => void) | null = null;
                let aborted = false;
                let processing = true;

                if (input && typeof input === "object" && "signal" in input && isEventTarget(input.signal)) {
                    let abortFn = function () { if (processing) { aborted = true; } removeFn!(); }
                    removeFn = function () { (input.signal as EventTarget).removeEventListener("abort", abortFn); }
                    input.signal.addEventListener("abort", abortFn);
                }

                payload.promise.then((function (this: typeof globalThis, r: string | ArrayBuffer) {
                    init!.body = r !== "" ? r : null;
                    if (!aborted) { resolve(fetchFn.call(this, input, init)); }
                    else { reject(new DOMException("The user aborted a request.", "AbortError")); }
                    processing = false;
                }).bind(this))
                    .catch(function (e: Error) {
                        reject(new TypeError("Failed to fetch"));
                        processing = false;
                        console.error(e);
                    })
                    .then(function () { if (removeFn) { removeFn(); } }); // finally
            } else {
                if (init && init.body && (fullOverride.value ? isURLSearchParams(init.body) : isPolyfillType<URLSearchParams>("URLSearchParams", init.body))) {
                    setContentType(init, "application/x-www-form-urlencoded;charset=UTF-8");
                    init.body = (init.body as URLSearchParams).toString();
                }

                resolve(fetchFn.call(this, input, init));
            }
        }).bind(this));
    }

    _fetch["__MPHTTPX__Polyfill__"] = true;
    return _fetch;
}

export function fixXMLHttpRequest(XHRClass?: typeof XMLHttpRequest) {
    const Klass = (XHRClass as typeof XMLHttpRequest) || (typeof XMLHttpRequest !== "undefined" && XMLHttpRequest);
    if (!Klass || "__MPHTTPX__Polyfill__" in Klass || "__MPHTTPX__" in Klass.prototype) return;

    const _abort = Klass.prototype.abort;
    const _open = Klass.prototype.open;
    const _send = Klass.prototype.send;
    const _setRequestHeader = Klass.prototype.setRequestHeader;

    Klass.prototype.abort = function () {
        if (state(this).processing) { state(this).aborted = true; }
        _abort.call(this);
        state(this).hasContentType = false;
    }

    Klass.prototype.open = function (method: string, url: string | URL, async: boolean = true, username: string | null = null, password: string | null = null): void {
        if (state(this).processing) { state(this).aborted = true; }
        _open.call(this, method, url, async, username, password);
        state(this).hasContentType = false;
    }

    Klass.prototype.send = function (this: XMLHttpRequest, body?: Document | XMLHttpRequestBodyInit | null): void {
        if (fullOverride.value ? isFormData(body) : isPolyfillType<FormData>("FormData", body)) {
            body = FormData_toBlob(body as FormData);
            if (!state(this).hasContentType) {
                this.setRequestHeader("Content-Type", body.type);
            }
        }

        if (fullOverride.value ? isBlob(body) : isPolyfillType<Blob>("Blob", body)) {
            let payload = new Payload(body as Blob);
            if (payload.type && !state(this).hasContentType) {
                this.setRequestHeader("Content-Type", payload.type);
            }

            const withCredentials = this.withCredentials;
            state(this).processing = true;

            payload.promise.then((function (this: XMLHttpRequest, r: string | ArrayBuffer) {
                if (!state(this).aborted) {
                    if (withCredentials !== this.withCredentials) {
                        this.withCredentials = withCredentials;
                        console.warn("Illegal to set the 'withCredentials' property on 'XMLHttpRequest': The value may only be set if the object's state is UNSENT or OPENED.");
                    }

                    _send.call(this, r !== "" ? r : undefined);
                }
                state(this).aborted = false;
                state(this).processing = false;
            }).bind(this))
                .catch((function (this: XMLHttpRequest, e: Error) {
                    state(this).aborted = false;
                    state(this).processing = false;
                    console.error(e);
                }).bind(this));
        } else {
            if (!state(this).hasContentType && (fullOverride.value ? isURLSearchParams(body) : isPolyfillType<URLSearchParams>("URLSearchParams", body))) {
                this.setRequestHeader("Content-Type", "application/x-www-form-urlencoded;charset=UTF-8");
                body = (body as URLSearchParams).toString();
            }

            _send.call(this, body);
        }
    }

    Klass.prototype.setRequestHeader = function (name: string, value: string): void {
        if (state(this).processing) { throw new DOMException("Failed to execute 'setRequestHeader' on 'XMLHttpRequest': The object's state must be OPENED.", "InvalidStateError"); }
        _setRequestHeader.call(this, name, value);
        if (String(name).toLowerCase() === "content-type") state(this).hasContentType = true;
    }

    // @ts-ignore
    Klass["__MPHTTPX__Polyfill__"] = true;

    class XMLHttpRequestState {
        aborted = false;
        processing = false;
        hasContentType = false;
    }

    function state(target: XMLHttpRequest): XMLHttpRequestState {
        const prop = "__XMLHttpRequest_Polyfill__";
        // @ts-ignore
        if (!(prop in target)) { setState(target, prop, new XMLHttpRequestState()); } return target[prop];
    }
}

export function fixWebSocket(WSClass?: typeof WebSocket) {
    const Klass = (WSClass as typeof WebSocket) || (typeof WebSocket !== "undefined" && WebSocket);
    if (!Klass || "__MPHTTPX__Polyfill__" in Klass || "__MPHTTPX__" in Klass.prototype) return;

    const _send = Klass.prototype.send;
    Klass.prototype.send = function (data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
        if (fullOverride.value ? isBlob(data) : isPolyfillType<Blob>("Blob", data)) {
            let payload = new Payload(data);
            payload.promise.then((function (this: WebSocket, r: string | ArrayBuffer) {
                if (this.readyState !== 1 /* OPEN */) return;
                _send.call(this, r);
            }).bind(this));
        } else {
            _send.call(this, data);
        }
    }

    // @ts-ignore
    Klass["__MPHTTPX__Polyfill__"] = true;
}
