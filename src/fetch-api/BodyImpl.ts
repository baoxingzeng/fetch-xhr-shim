import { _Symbol, className, setState, typeString, isObjectType } from "../utils";
import { isArrayBuffer } from "../encoding/TextDecoderP";
import { isURLSearchParams } from "../network/URLSearchParamsP";
import { Blob, isBlob, encode, decode } from "../file-system/BlobP";
import { FormData_toBlob, isFormData, extractBoundary, createFormDataFromBinaryText } from "../network/FormDataP";

export class Payload {
    constructor(body?: XMLHttpRequestBodyInit | null, contentType?: string) {
        if (contentType) {
            this.type = contentType;
        }

        if (typeof body === "string") {
            this.promise = Promise.resolve(body);
            this.type = "text/plain;charset=UTF-8";
            this.calcLength = function () { return encode(body).length; }
        }

        else if (isURLSearchParams(body)) {
            let _body = body.toString();
            this.promise = Promise.resolve(_body);
            this.type = "application/x-www-form-urlencoded;charset=UTF-8";
            this.calcLength = function () { return encode(_body).length; }
        }

        else if (isArrayBuffer(body)) {
            this.promise = Promise.resolve(body.slice(0));
            this.length = body.byteLength;
        }

        else if (ArrayBuffer.isView(body)) {
            let _body = body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength);
            this.promise = Promise.resolve(_body);
            this.length = _body.byteLength;
        }

        else if (isBlob(body)) {
            this.promise = body.arrayBuffer();
            this.type = body.type;
            this.length = body.size;
        }

        else if (isFormData(body)) {
            let _body = FormData_toBlob(body, contentType ? extractBoundary(contentType) : undefined);
            this.promise = _body.arrayBuffer();
            this.type = _body.type;
            this.length = _body.size;
        }

        else if (body === null || body === undefined) {
            this.promise = Promise.resolve("");
            this.length = 0;
        }

        else {
            let _body = "" + body;
            this.promise = Promise.resolve(_body);
            this.type = "text/plain;charset=UTF-8";
            this.calcLength = function () { return encode(_body).length; }
        }
    }

    promise: Promise<string | ArrayBuffer>;

    get type() { return this._type; }
    set type(value: string) { if (!this._type) this._type = value; }

    get size() {
        if (typeof this.length !== "number" && this.calcLength) this.length = this.calcLength();
        return this.length ?? 0;
    }

    private _type = "";
    private length?: number;
    private calcLength?: () => number;

    text() { return this.promise.then(function (r) { return typeof r === "string" ? r : decode(r); }); }
    arrayBuffer() { return this.promise.then(function (r) { return isArrayBuffer(r) ? r : encode(r).buffer; }); }
}

export class BodyImpl implements Body {
    /** @internal */
    constructor() {
        if (this.constructor === BodyImpl) {
            throw new TypeError("Failed to construct 'Body': Illegal constructor");
        }

        setState(this, "__Body__", new BodyState());
    }

    /** @internal */ declare readonly __Body__: BodyState;

    get bodyUsed(): boolean { return state(this).bodyUsed; };
    get body(): ReadableStream<Uint8Array<ArrayBuffer>> | null {
        throw new TypeError(`Failed to access 'body' on '${className(this)}': property not implemented.`);
    }

    arrayBuffer(): Promise<ArrayBuffer> {
        const kind = "arrayBuffer";
        return consumed(this, kind) || read(this, kind) as Promise<ArrayBuffer>;
    }

    blob(): Promise<Blob> {
        const kind = "blob";
        return consumed(this, kind) || read(this, kind) as Promise<Blob>;
    }

    bytes(): Promise<Uint8Array<ArrayBuffer>> {
        const kind = "bytes";
        return consumed(this, kind) || read(this, kind) as Promise<Uint8Array<ArrayBuffer>>;
    }

    formData(): Promise<FormData> {
        const kind = "formData";
        return consumed(this, kind) || read(this, kind) as Promise<FormData>;
    }

    json(): Promise<any> {
        const kind = "json";
        return consumed(this, kind) || read(this, kind);
    }

    text(): Promise<string> {
        const kind = "text";
        return consumed(this, kind) || read(this, kind) as Promise<string>;
    }

    /** @internal */ toString() { return "[object Body]"; }
    /** @internal */ get [_Symbol.toStringTag]() { return "Body"; }
    /** @internal */ get __MPHTTPX__() { return { chain: ["Body"] }; }
}

/** @internal */
class BodyState {
    bodyUsed = false;
    payload?: Payload | undefined;
}

function state(target: BodyImpl) {
    return target.__Body__;
}

export function initBody(instance: Body, body?: BodyInit | null | undefined) {
    const b = instance as BodyImpl;
    if (isGlobalReadableStream(body) || isOtherReadableStream(body)) {
        throw new TypeError(`Failed to construct '${className(b)}': ReadableStream not implemented.`);
    }

    if (body !== null && body !== undefined) {
        state(b).payload = new Payload(body);
    }
}

function read(body: BodyImpl, kind: "arrayBuffer" | "blob" | "bytes" | "formData" | "json" | "text"): Promise<unknown> {
    let payload = state(body).payload || new Payload();

    if (kind === "json") {
        return payload.text().then(function (r) { return JSON.parse(r); });
    }

    else if (kind === "text") {
        return payload.text();
    }

    else if (kind === "arrayBuffer") {
        return payload.arrayBuffer();
    }

    else if (kind === "bytes") {
        return payload.arrayBuffer().then(function (r) { return new Uint8Array(r); });
    }

    else if (kind === "blob") {
        return payload.promise.then(function (r) { return new Blob([r]); });
    }

    else if (kind === "formData") {
        return payload.text().then(function (r) { return createFormDataFromBinaryText(r, extractBoundary(payload.type)); });
    }

    else {
        return payload.promise as Promise<never>;
    }
}

function consumed(body: BodyImpl, kind: string) {
    if (!state(body).payload) return;
    if (!body.bodyUsed) { state(body).bodyUsed = true; return; }
    return Promise.reject(new TypeError(`Failed to execute '${kind}' on '${className(body)}': body stream already read`));
}

function isGlobalReadableStream(value: unknown): value is ReadableStream {
    return !!value
        && typeof value === "object"
        && typeof ReadableStream === "function" && value instanceof ReadableStream;
}

function isOtherReadableStream(value: unknown): value is ReadableStream {
    return !!value
        && typeof value === "object"
        && "getReader" in (value as object)
        && typeof (value as (object & Record<"getReader", unknown>)).getReader === "function"
        && (isObjectType<ReadableStream>("ReadableStream", value) || typeString(value) === "[object ReadableStream]");
}
