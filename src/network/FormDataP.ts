import { File, FileP } from "../file-system/FileP";
import { Blob, BlobP, isBlob } from "../file-system/BlobP";
import { _Symbol, setState, isPolyfillType, makeIterator, checkArgsLength } from "../utils";

export class FormDataP implements FormData {
    constructor(form?: HTMLFormElement, submitter?: HTMLElement | null) {
        setState(this, "__FormData__", new FormDataState());

        if (form !== undefined) {
            try {
                let elements = form.elements;
                for (let i = 0; i < elements.length; ++i) {
                    let elm = elements[i]! as HTMLFormElement;
                    if (!elm.name || elm.disabled || elm.type === "submit" || elm.type === "button" || elm.matches("form fieldset[disabled] *")) return;

                    if (elm.type === "file") {
                        let files: File[] = elm.files && elm.files.length
                            ? elm.files
                            : [new File([], "", { type: "application/octet-stream" })];

                        for (let i = 0; i < files.length; ++i) {
                            this.append(elm.name, files[i]!);
                        }
                    } else if (elm.type === "select-multiple" || elm.type === "select-one") {
                        for (let i = 0; i < elm.options.length; ++i) {
                            let opt = elm.options[i];
                            !opt.disabled && opt.selected && this.append(elm.name, opt.value);
                        }
                    } else if (elm.type === "checkbox" || elm.type === "radio") {
                        if (elm.checked) this.append(elm.name, elm.value);
                    } else {
                        let value = elm.type === "textarea" ? normalizeLinefeeds(elm.value) : elm.value;
                        this.append(elm.name, value);
                    }
                }
            } catch (e) {
                throw new TypeError("Failed to construct 'FormData': parameter 1 is not of type 'HTMLFormElement'.")
            }
        }

        if (submitter !== undefined && submitter !== null) {
            console.warn("Ignoring the 'submitter' of 'FormData' constructor: parameter 2 not implemented.");
        }
    }

    /** @internal */ declare readonly __FormData__: FormDataState;

    append(name: string, blobValue: string | Blob, filename?: string): void {
        checkArgsFn(arguments.length, 2, "append");
        state(this).array.push(normalizeArgs(name, blobValue, filename));
    }

    ["delete"](name: string): void {
        checkArgsFn(arguments.length, 1, "delete");
        let _name = "" + name;
        let index = -1;
        let array = state(this).array;
        let result: [string, FormDataEntryValue][] = [];
        for (let i = 0; i < array.length; ++i) {
            let item = array[i]!;
            if (item[0] === _name) { index = i; continue; }
            result.push(item);
        }
        if (index > -1) { state(this).array = result; }
    }

    get(name: string): FormDataEntryValue | null {
        checkArgsFn(arguments.length, 1, "get");
        let _name = "" + name;
        let array = state(this).array;
        for (let i = 0; i < array.length; ++i) {
            let item = array[i]!;
            if (item[0] === _name) { return item[1]; }
        }
        return null;
    }

    getAll(name: string): FormDataEntryValue[] {
        checkArgsFn(arguments.length, 1, "getAll");
        let _name = "" + name;
        let array = state(this).array;
        let result: FormDataEntryValue[] = [];
        for (let i = 0; i < array.length; ++i) {
            let item = array[i]!;
            if (item[0] === _name) { result.push(item[1]); }
        }
        return result;
    }

    has(name: string): boolean {
        checkArgsFn(arguments.length, 1, "has");
        let _name = "" + name;
        let array = state(this).array;
        for (let i = 0; i < array.length; ++i) {
            let item = array[i]!;
            if (item[0] === _name) { return true; }
        }
        return false;
    }

    set(name: string, blobValue: string | Blob, filename?: string): void {
        checkArgsFn(arguments.length, 2, "set");
        let _name = "" + name;
        let _args = normalizeArgs(name, blobValue, filename);
        let index = -1;
        let array = state(this).array;
        let result: [string, FormDataEntryValue][] = [];
        for (let i = 0; i < array.length; ++i) {
            let item = array[i]!;
            if (item[0] === _name) {
                if (index === -1) {
                    index = i;
                    result.push(_args);
                }
                continue;
            }
            result.push(item);
        }
        if (index === -1) {
            result.push(_args);
        }
        state(this).array = result;
    }

    forEach(callbackfn: (value: FormDataEntryValue, key: string, parent: FormData) => void, thisArg?: any): void {
        checkArgsFn(arguments.length, 1, "forEach");
        if (typeof callbackfn !== "function") {
            throw new TypeError("Failed to execute 'forEach' on 'FormData': parameter 1 is not of type 'Function'.");
        }
        let array = state(this).array;
        for (let i = 0; i < array.length; ++i) {
            let item = array[i]!;
            callbackfn.call(thisArg, item[1], item[0], thisArg);
        }
    }

    entries(): FormDataIterator<[string, FormDataEntryValue]> {
        return makeIterator(state(this).array.map(function (x) { return [x[0], x[1]] as [string, FormDataEntryValue]; }));
    }

    keys(): FormDataIterator<string> {
        return makeIterator(state(this).array.map(function (x) { return x[0]; }));
    }

    values(): FormDataIterator<FormDataEntryValue> {
        return makeIterator(state(this).array.map(function (x) { return x[1]; }));
    }

    declare [Symbol.iterator]: () => FormDataIterator<[string, FormDataEntryValue]>;

    // @ts-ignore
    /** @internal */[_Symbol.iterator](): FormDataIterator<[string, FormDataEntryValue]> {
        return this.entries();
    }

    /** @internal */ toString() { return "[object FormData]"; }
    /** @internal */ get [_Symbol.toStringTag]() { return "FormData"; }
    /** @internal */ get __MPHTTPX__() { return { chain: ["FormData"] }; }
}

/** @internal */
class FormDataState {
    array: [string, FormDataEntryValue][] = [];
}

function state(target: FormDataP) {
    return target.__FormData__;
}

function checkArgsFn(actual: number, expect: number, funcName: string) {
    return checkArgsLength(actual, expect, "FormData", funcName);
}

function normalizeArgs(name: string, value: string | Blob, filename?: string): [string, FormDataEntryValue] {
    if (isBlob(value)) {
        filename = filename !== undefined
            ? ("" + filename)
            : typeof (value as File).name === "string"
                ? (value as File).name
                : "blob";
        if ((value as File).name !== filename || isBlob(value, true)) {
            let FileClass = !isPolyfillType<Blob>("Blob", value) ? File : FileP;
            value = new FileClass([value], filename);
        }
        return ["" + name, value as File];
    }
    return ["" + name, "" + value];
}

export function isFormData(value: unknown): value is FormData {
    return isPolyfillType<FormData>("FormData", value) || isExternalFormData(value);
}

function isExternalFormData(value: unknown): value is FormData {
    let expect = "[object FormData]";
    return (Object.prototype.toString.call(value) === expect || String(value) === expect)
        && !!value
        && typeof value === "object"
        && "forEach" in (value as object)
        && typeof (value as (object & Record<"forEach", unknown>)).forEach === "function";
}

export function FormData_toBlob(formData: FormData, externalBoundary?: string): Blob {
    const boundary = externalBoundary || ("----formdata-mphttpx-" + Math.random());
    const p = `--${boundary}\r\nContent-Disposition: form-data; name="`;

    let chunks: BlobPart[] = [];
    let useNativeBlob = true;

    formData.forEach(function (value: FormDataEntryValue, name: string) {
        if (typeof value === "string") {
            chunks.push(p + escape(normalizeLinefeeds(name)) + `"\r\n\r\n${normalizeLinefeeds(value)}\r\n`);
        } else {
            if (useNativeBlob && isPolyfillType<Blob>("Blob", value)) { useNativeBlob = false; }
            chunks.push(p + escape(normalizeLinefeeds(name)) + `"; filename="${escape(value.name)}"\r\nContent-Type: ${value.type || "application/octet-stream"}\r\n\r\n`, value, `\r\n`);
        }
    });

    chunks.push(`--${boundary}--`);
    let BlobClass = useNativeBlob ? Blob : BlobP;

    return new BlobClass(chunks, { type: "multipart/form-data; boundary=" + boundary });
}

// normalize line feeds for textarea
// https://html.spec.whatwg.org/multipage/form-elements.html#textarea-line-break-normalisation-transformation
function normalizeLinefeeds(value: string) {
    return value.replace(/\r?\n|\r/g, "\r\n");
}

function escape(str: string) {
    return str.replace(/\n/g, '%0A').replace(/\r/g, '%0D').replace(/"/g, '%22');
}

export function extractBoundary(contentType: string | null) {
    if (!contentType) return;
    if (!/multipart\/form-data/i.test(contentType)) return;

    let boundaryMatch = contentType.match(/boundary\s*=\s*([^;]+)/i);
    if (boundaryMatch && boundaryMatch[1]) {
        let boundary = boundaryMatch[1].trim();
        return boundary.replace(/^["']|["']$/g, "");
    }
}

export function createFormDataFromBinaryText(text: string, boundary?: string): FormData {
    const throwParseError = function () {
        throw new TypeError("Could not parse content as FormData.");
    }

    if (typeof text !== "string" || text.trim() === "") {
        throwParseError();
    }

    let firstLineEnd = text.indexOf("\r\n");
    if (firstLineEnd === -1) { throwParseError(); }

    let _boundary = text.substring(2, firstLineEnd).trim();
    if (!_boundary) { throwParseError(); }

    if (boundary !== undefined && boundary !== _boundary) {
        throwParseError();
    }

    let parts = text.split(`--${_boundary}`).filter(function (part) {
        let trimmed = part.trim();
        return trimmed !== "" && trimmed !== "--";
    });

    if (parts.length === 0) {
        throwParseError();
    }

    let pairs: [string, FormDataEntryValue][] = [];
    let hasFile = false;

    parts.forEach(function (part) {
        let separatorIndex = part.indexOf("\r\n\r\n");
        if (separatorIndex === -1) { throwParseError(); }

        let headerRaw = part.substring(0, separatorIndex).trim();
        let nameMatch = headerRaw.match(/name="([^"]*)"/);
        if (!nameMatch || nameMatch.length < 2) { throwParseError(); }
        let fieldName = nameMatch![1]!;
        let filenameMatch = headerRaw.match(/filename="([^"]*)"/);
        let contentRaw = part.substring(separatorIndex + 4);

        if (!filenameMatch) {
            pairs.push([fieldName, contentRaw.replace(/^[\r\n]+|[\r\n]+$/g, "")]);
        } else {
            let filename = filenameMatch[1] || "";
            let contentTypeMatch = headerRaw.match(/Content-Type: ([^\r\n]+)/);
            let mimeType = contentTypeMatch ? (contentTypeMatch[1] || "").trim() : "text/plain";
            let content = contentRaw.replace(/\r\n/g, "");
            hasFile = true;
            pairs.push([fieldName, new File([content], filename, { type: mimeType })]);
        }
    });

    let useNativeFormData = !hasFile || (function () {
        try {
            let fd = new FormDataE();
            fd.append("file", new File([], ""));
            return typeof fd.get("file") !== "string";
        } catch (e) {
            return false;
        }
    })();

    let FormDataClass = useNativeFormData ? FormDataE : FormDataP;
    let formData = new FormDataClass();
    pairs.forEach(function (x) { formData.append(x[0], x[1]); });
    return formData;
}

const FormDataE = (typeof FormData !== "undefined" && FormData) as typeof FormData || FormDataP;
export { FormDataE as FormData };
