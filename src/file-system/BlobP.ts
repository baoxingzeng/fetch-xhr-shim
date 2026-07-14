import { TextEncoder } from "../encoding/TextEncoderP";
import { TextDecoder, isArrayBuffer } from "../encoding/TextDecoderP";
import { _Symbol, setState, typeString, isPolyfillType, isSequence } from "../utils";

export const encode = TextEncoder.prototype.encode.bind(new TextEncoder());
export const decode = TextDecoder.prototype.decode.bind(new TextDecoder());

const mp = { ReadableStream: (typeof ReadableStream !== "undefined" && ReadableStream) as typeof ReadableStream || undefined };
export function setReadableStreamClass(RSClass: unknown) { mp.ReadableStream = RSClass as typeof ReadableStream; }

export class BlobP implements Blob {
    constructor(blobParts: BlobPart[] = [], options?: BlobPropertyBag) {
        if (!isSequence(blobParts)) {
            throw new TypeError(`Failed to construct 'Blob/File': The provided value cannot be converted to a sequence.`);
        }

        let _blobParts = Array.isArray(blobParts) ? blobParts : Array.from<BlobPart>(blobParts);
        let tasks: Promise<Uint8Array<ArrayBuffer>>[] = [];
        let size = 0;

        for (let i = 0; i < _blobParts.length; ++i) {
            let chunk = _blobParts[i]!;
            if (isBlob(chunk)) {
                size += chunk.size;
                tasks.push(chunk.arrayBuffer().then(function (r: ArrayBuffer) { return new Uint8Array(r); }));
            } else {
                let bytes = (isArrayBuffer(chunk) || ArrayBuffer.isView(chunk))
                    ? BufferSource_toUint8Array(chunk)
                    : encode(chunk);
                size += bytes.length;
                tasks.push(Promise.resolve(bytes));
            }
        }

        setState(this, "__Blob__", new BlobState(Promise.all(tasks).then(function (chunks: Uint8Array<ArrayBuffer>[]) { return concat(chunks); })));
        state(this).size = size;
        state(this).type = normalizeType(options?.type);
    }

    /** @internal */ declare readonly __Blob__: BlobState;

    get size(): number { return state(this).size; }
    get type(): string { return state(this).type; }

    arrayBuffer(): Promise<ArrayBuffer> {
        return state(this).promise.then(function (r) { return clone(r.buffer).buffer; });
    }

    bytes(): Promise<Uint8Array<ArrayBuffer>> {
        return state(this).promise.then(function (r) { return clone(r.buffer); });
    }

    slice(start?: number, end?: number, contentType?: string): Blob {
        let _start = start ?? 0, _end = end ?? this.size;
        let blob = Object.create(BlobP.prototype) as BlobP;
        setState(blob, "__Blob__", new BlobState(state(this).promise.then(function (r) { return clone(r.slice(_start, _end)); })));
        state(blob).size = calcSlicedSize(this.size, _start, _end);
        state(blob).type = normalizeType(contentType);
        return blob;
    }

    stream(): ReadableStream<Uint8Array<ArrayBuffer>> {
        let ReadableStreamClass = mp.ReadableStream || (function () { throw new ReferenceError("ReadableStream is not defined") })();
        let position = 0;

        try {
            return new ReadableStreamClass({
                type: "bytes",
                autoAllocateChunkSize: 524288,
                pull: (function (this: Blob, controller: ReadableByteStreamController) {
                    let v = controller.byobRequest?.view;
                    let chunk = this.slice(position, v?.byteLength ? (position + v.byteLength) : undefined);
                    return chunk.arrayBuffer().then((function (this: Blob, buffer: ArrayBuffer) {
                        let uint8array = new Uint8Array(buffer);
                        let bytesRead = uint8array.byteLength;
                        position += bytesRead;
                        (v as Uint8Array).set(uint8array);
                        controller.byobRequest?.respond(bytesRead);

                        if (position >= this.size)
                            controller.close();
                    }).bind(this));
                }).bind(this),
            });
        } catch (e) {
            return new ReadableStreamClass({
                pull: (function (this: Blob, controller: ReadableStreamDefaultController<Uint8Array<ArrayBuffer>>) {
                    let chunk = this.slice(position, position + 524288);
                    return chunk.arrayBuffer().then((function (this: Blob, buffer: ArrayBuffer) {
                        position += buffer.byteLength;
                        let uint8array = new Uint8Array(buffer);
                        controller.enqueue(uint8array);

                        if (position == this.size)
                            controller.close();
                    }).bind(this));
                }).bind(this),
            });
        }
    }

    text(): Promise<string> {
        return state(this).promise.then(function (r) { return decode(r); });
    }

    /** @internal */ toString() { return "[object Blob]"; }
    /** @internal */ get [_Symbol.toStringTag]() { return "Blob"; }
    /** @internal */ get __MPHTTPX__() { return { chain: ["Blob"] }; }
}

/** @internal */
class BlobState {
    constructor(promise: Promise<Uint8Array<ArrayBuffer>>) {
        this.promise = promise;
    }
    promise: Promise<Uint8Array<ArrayBuffer>>;
    size = 0;
    type = "";
}

function state(target: BlobP) {
    return target.__Blob__;
}

function BufferSource_toUint8Array(buf: BufferSource): Uint8Array<ArrayBuffer> {
    return isArrayBuffer(buf)
        ? new Uint8Array(buf)
        : new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

function normalizeType(type?: string) {
    let rawType = "" + (type !== undefined ? type : "");
    return /[^\u0020-\u007E]/.test(rawType) ? "" : rawType.toLowerCase();
}

function clone(buf: BufferSource) {
    let sourceArray = BufferSource_toUint8Array(buf);
    let cloneArray = new Uint8Array(new ArrayBuffer(sourceArray.byteLength));

    cloneArray.set(sourceArray);
    return cloneArray;
}

function concat(chunks: Uint8Array<ArrayBuffer>[]) {
    let totalByteLength = chunks.reduce(function (acc, cur) { return acc + cur.byteLength; }, 0);
    let result = new Uint8Array(totalByteLength);
    chunks.reduce(function (offset, chunk) { result.set(chunk, offset); return offset + chunk.byteLength; }, 0);
    return result;
}

function calcSlicedSize(size: number, start?: number, end?: number) {
    const normalizeNumer = function (n?: number) {
        let num = Number(n); if (isNaN(num)) num = 0;
        if (num >= 0) {
            num = Math.min(num, size);
        } else {
            num = Math.max(0, num + size);
        }
        return num;
    }
    return Math.max(0, normalizeNumer(end) - normalizeNumer(start));
}

export function isBlob(value: unknown, strict = false): value is Blob {
    return isPolyfillType<Blob>("Blob", value, strict) || isExternalBlob(value, strict);
}

function isExternalBlob(value: unknown, strict = false): value is Blob {
    let expects = ["[object Blob]"];
    if (!strict) expects.push("[object File]");

    return !!value
        && typeof value === "object"
        && "size" in (value as object)
        && typeof (value as (object & Record<"size", unknown>)).size === "number"
        && "arrayBuffer" in (value as object)
        && typeof (value as (object & Record<"arrayBuffer", unknown>)).arrayBuffer === "function"
        && (expects.indexOf(Object.prototype.toString.call(value)) > -1 || expects.indexOf(typeString(value)) > -1);
}

const BlobE = (function () { try { return new Blob(['ä']).size === 2; } catch (e) { return false; } })() as true ? Blob : BlobP;
export { BlobE as Blob };
