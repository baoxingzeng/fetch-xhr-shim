import { fetchP } from "./fetch-api/fetchP";
import { Payload } from "./fetch-api/BodyImpl";
import { FormData_toBlob } from "./network/FormDataP";
import { isEventTarget } from "./event-system/EventTargetP";
import { DOMException, setState, isPolyfillType, isSequence } from "./utils";

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

    function _fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
        if (isPolyfillType<Request>("Request", input) as never) {
            return fetchP(input, init);
        }

        if (init && init.headers && isPolyfillType<Headers>("Headers", init.headers)) {
            if (typeof Headers !== "undefined" && Headers && !("__MPHTTPX__" in Headers.prototype)) {
                let headers = new Headers();
                init.headers.forEach((value, name) => { headers.append(name, value); });
                init.headers = headers;
            } else {
                let headers: Record<string, string> = {};
                init.headers.forEach((value, name) => { headers[name] = value; });
                init.headers = headers;
            }
        }

        return new Promise((resolve, reject) => {
            if (init && init.body && isPolyfillType<FormData>("FormData", init.body)) {
                init.body = FormData_toBlob(init.body);
            }

            if (init && init.body && isPolyfillType<Blob>("Blob", init.body)) {
                let payload = new Payload(init.body);
                if (payload.type) {
                    setContentType(init, payload.type);
                }

                let removeFn: (() => void) | null = null;
                let aborted = false;
                let processing = true;

                if (input && typeof input === "object" && "signal" in input && isEventTarget(input.signal)) {
                    let abortFn = () => { if (processing) { aborted = true; } removeFn!(); }
                    removeFn = () => { input.signal.removeEventListener("abort", abortFn); }
                    input.signal.addEventListener("abort", abortFn);
                }

                payload.promise.then(r => {
                    init.body = r !== "" ? r : null;
                    if (!aborted) { resolve(fetchFn(input, init)); }
                    else { reject(new DOMException("The user aborted a request.", "AbortError")); }
                    processing = false;
                })
                    .catch((e: Error) => {
                        reject(new TypeError("Failed to fetch"));
                        console.error(e);
                        processing = false;
                    })
                    .then(() => { if (removeFn) { removeFn(); } }); // finally
            } else {
                if (init && init.body && isPolyfillType<URLSearchParams>("URLSearchParams", init.body)) {
                    setContentType(init, "application/x-www-form-urlencoded;charset=UTF-8");
                }
                resolve(fetchFn(input, init));
            }
        });
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
        if (isPolyfillType<FormData>("FormData", body)) {
            body = FormData_toBlob(body);
            if (!state(this).hasContentType) {
                this.setRequestHeader("Content-Type", body.type);
            }
        }

        if (isPolyfillType<Blob>("Blob", body)) {
            let payload = new Payload(body);
            if (payload.type && !state(this).hasContentType) {
                this.setRequestHeader("Content-Type", payload.type);
            }

            const withCredentials = this.withCredentials;
            state(this).processing = true;

            payload.promise.then((function (this: XMLHttpRequest, r: string | ArrayBuffer) {
                if (!state(this).aborted) {
                    if (withCredentials !== this.withCredentials) {
                        console.warn("Illegal to set the 'withCredentials' property on 'XMLHttpRequest': The value may only be set if the object's state is UNSENT or OPENED.");
                        this.withCredentials = withCredentials;
                    }

                    _send.call(this, r !== "" ? r : undefined);
                }
                state(this).aborted = false;
                state(this).processing = false;
            }).bind(this))
                .catch((function (this: XMLHttpRequest, e: Error) {
                    console.error(e);
                    state(this).aborted = false;
                    state(this).processing = false;
                }).bind(this));
        } else {
            if (isPolyfillType<URLSearchParams>("URLSearchParams", body) && !state(this).hasContentType)
                this.setRequestHeader("Content-Type", "application/x-www-form-urlencoded;charset=UTF-8");
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
        if (isPolyfillType<Blob>("Blob", data)) {
            let payload = new Payload(data);
            payload.promise.then(r => {
                if (this.readyState !== 1 /* OPEN */) return;
                _send.call(this, r);
            });
        } else {
            _send.call(this, data);
        }
    }

    // @ts-ignore
    Klass["__MPHTTPX__Polyfill__"] = true;
}
