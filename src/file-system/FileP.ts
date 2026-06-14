import { Blob, BlobP } from "./BlobP";
import { _Symbol, setState, checkArgsLength } from "../utils";

declare class FileP extends Blob implements File {
    constructor(fileBits: BlobPart[], fileName: string, options?: FilePropertyBag);
    readonly lastModified: number;
    readonly name: string;
    readonly webkitRelativePath: string;

    /** @internal */ declare readonly __File__: FileState;
    /** @internal */ declare readonly __MPHTTPX__: { chain: string[]; };
}

function createFileClass(BlobClass: typeof Blob): typeof FileP {
    class FileClass extends BlobClass implements File {
        constructor(fileBits: BlobPart[], fileName: string, options?: FilePropertyBag) {
            checkArgsLength(arguments.length, 2, "File");
            super(fileBits, options);
            setState(this, "__File__", new FileState());
            state(this).lastModified = +(options?.lastModified ? new Date(options.lastModified) : new Date()) || 0;
            state(this).name = "" + fileName;
        }

        /** @internal */ declare readonly __File__: FileState;

        get lastModified(): number { return state(this).lastModified; }
        get name(): string { return state(this).name; }
        get webkitRelativePath(): string { return ""; }

        /** @internal */ toString() { return "[object File]"; }
        /** @internal */ get [_Symbol.toStringTag]() { return "File"; }
        /** @internal */ declare readonly __MPHTTPX__: { chain: string[]; };
    }

    if (Object.is(BlobClass, BlobP)) {
        Object.defineProperty(FileClass.prototype, "__MPHTTPX__", {
            configurable: true,
            get: function () { return { chain: ["File", "Blob"] }; },
        });
    }

    return FileClass;
}

/** @internal */
class FileState {
    lastModified = 0;
    name = "";
}

function state(target: { __File__: FileState }) {
    return target.__File__;
}

const FilePolyfill = createFileClass(BlobP);
const FileE = (function () { try { new File([], ""); return true; } catch (e) { return false; } })() as true
    ? File
    : Object.is(Blob, BlobP)
        ? FilePolyfill
        : createFileClass(Blob);

export { FilePolyfill as FileP };
export { FileE as File };
