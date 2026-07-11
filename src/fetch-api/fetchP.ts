import { Payload } from "./BodyImpl";
import { RequestP } from "./RequestP";
import { ResponseP } from "./ResponseP";
import { DOMException, checkArgsLength } from "../utils";
import { isHeaders, normalizeName, normalizeValue, parseHeaders } from "./HeadersP";

const mp = { XMLHttpRequest: (typeof XMLHttpRequest !== "undefined" && XMLHttpRequest) as typeof XMLHttpRequest || undefined };
export function setXMLHttpRequestClass(XHRClass: unknown) { mp.XMLHttpRequest = XHRClass as typeof XMLHttpRequest; }

export function fetchP(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    checkArgsLength(arguments.length, 1, "Window", "fetch");    // @ts-expect-error
    if (this instanceof fetchP) { throw new TypeError("fetch is not a constructor"); }

    return new Promise(function (resolve: ((value: Response) => void), reject: ((reason?: any) => void)) {
        const request = new RequestP(input, init);
        const signal = request.__Request__.signal;

        if (signal && signal.aborted) {
            return reject(signal.reason);
        }

        let XMLHttpRequestClass = mp.XMLHttpRequest || (function () { throw new ReferenceError("XMLHttpRequest is not defined") })();
        let xhr = new XMLHttpRequestClass();
        let aborted = false;
        let payload = request.__Body__.payload;
        let response: ResponseP;

        xhr.onload = function () {
            let options = {
                headers: parseHeaders(xhr.getAllResponseHeaders() || ""),
                status: xhr.status,
                statusText: xhr.statusText,
            }

            // This check if specifically for when a user fetches a file locally from the file system
            // Only if the status is out of a normal range
            if (request.url.indexOf("file://") === 0 && (xhr.status < 200 || xhr.status > 599)) {
                options.status = 200;
            }

            setTimeout(function () {
                response = new ResponseP("response" in xhr ? xhr.response : (xhr as XMLHttpRequest).responseText, options);
                response.__Response__.url = "responseURL" in xhr ? xhr.responseURL : (options.headers.get("X-Request-URL") || "");

                let _payload = response.__Body__.payload;
                let _contentType = response.headers.get("Content-Type") || "";
                if (_payload && _contentType) { _payload.type = _contentType; }

                if (!aborted) resolve(response);
                else reject(createAbortException());
            }, 0);
        }

        xhr.onabort = function () { setTimeout(function () { reject(createAbortException()); }, 0); }
        xhr.onerror = function () { setTimeout(function () { reject(new TypeError("Failed to fetch")); }, 0); }
        xhr.ontimeout = function () { setTimeout(function () { reject(new DOMException("The request timed out.", "TimeoutError")); }, 0); }
        xhr.open(request.method, fixUrl(request.url), true);

        if (request.credentials === "include") {
            xhr.withCredentials = true;
        } else if (request.credentials === "omit") {
            xhr.withCredentials = false;
        }

        if ("responseType" in xhr) {
            xhr.responseType = "arraybuffer";
        }

        if (init && typeof init === "object" && init.headers && typeof init.headers === "object" && !isHeaders(init.headers)) {
            let headers = init.headers as Record<string, string>;
            let names: string[] = [];

            Object.getOwnPropertyNames(headers).forEach(function (name) {
                names.push(normalizeName(name));
                xhr.setRequestHeader(name, normalizeValue(headers[name]!));
            });

            request.headers.forEach(function (value: string, name: string) {
                if (names.indexOf(name) === -1) {
                    xhr.setRequestHeader(name, value);
                }
            });
        } else {
            request.headers.forEach(function (value: string, name: string) {
                xhr.setRequestHeader(name, value);
            });
        }

        if (signal) {
            const abortFn = function () {
                if (response && !response.bodyUsed) {
                    let _payload = response.__Body__.payload = new Payload();
                    _payload.promise = Promise.reject(createAbortException());
                }

                aborted = true; xhr.abort(); removeFn();
            }

            const removeFn = function () {
                signal.removeEventListener("abort", abortFn);
            }

            signal.addEventListener("abort", abortFn);
            xhr.onreadystatechange = function () { if (xhr.readyState === 4) removeFn(); }
        }

        if (!payload) xhr.send();
        else payload.promise.then(function (body) {
            if (!aborted) xhr.send(body !== "" ? body : undefined);
            else reject(createAbortException());
        })
            .catch(function (e) {
                reject(new TypeError("Failed to fetch"));
                console.error(e);
            });
    });
}

function createAbortException() {
    return new DOMException("The user aborted a request.", "AbortError");
}

const locationSupported = typeof location !== "undefined" && !!location;
const fixUrl = function (url: string) { if (url === "" && locationSupported && location?.href) { return location.href } else { return url; } }

const fetchE = (typeof fetch !== "undefined" && fetch) as typeof fetch || fetchP;
export { fetchE as fetch };
