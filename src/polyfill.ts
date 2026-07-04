import { TextEncoderP } from "./encoding/TextEncoderP";
import { TextDecoderP } from "./encoding/TextDecoderP";

import { EventTargetP } from "./event-system/EventTargetP";
import { EventP } from "./event-system/EventP";
import { CustomEventP } from "./event-system/CustomEventP";

import { AbortControllerP } from "./event-system/AbortControllerP";
import { AbortSignalP } from "./event-system/AbortSignalP";

import { BlobP } from "./file-system/BlobP";
import { FileP } from "./file-system/FileP";
import { FileReaderP } from "./file-system/FileReaderP";

import { URLSearchParamsP } from "./network/URLSearchParamsP";
import { FormDataP } from "./network/FormDataP";

import { fetchP } from "./fetch-api/fetchP";
import { HeadersP } from "./fetch-api/HeadersP";
import { RequestP } from "./fetch-api/RequestP";
import { ResponseP } from "./fetch-api/ResponseP";

import { fixFetch, fixXMLHttpRequest, fixWebSocket } from "./fixes";

/* eslint-disable no-prototype-builtins */
const g: typeof globalThis =
    (typeof globalThis !== "undefined" && globalThis) ||
    (typeof self !== "undefined" && self) ||
    // @ts-ignore eslint-disable-next-line no-undef
    (typeof global !== "undefined" && global) ||
    {};

if (!g.fetch) {
    g.fetch = fetchP;
    if (!g.Headers) { g.Headers = HeadersP; }
    if (!g.Request) { g.Request = RequestP; }
    if (!g.Response) { g.Response = ResponseP; }
} else {
    if (!g.Blob || !g.FormData) {
        g.fetch = fixFetch();
    }
}

if (typeof XMLHttpRequest !== "undefined" && XMLHttpRequest) {
    if (!g.Blob || !g.FormData) {
        fixXMLHttpRequest();
    }
}

if (typeof WebSocket !== "undefined" && WebSocket) {
    if (!g.Blob) {
        fixWebSocket();
    }
}

if (!g.TextEncoder) { g.TextEncoder = TextEncoderP; }
if (!g.TextDecoder) { g.TextDecoder = TextDecoderP; }

if (!g.EventTarget) {
    g.EventTarget = EventTargetP;
    if (!g.Event) { g.Event = EventP; }
    if (!g.CustomEvent) { g.CustomEvent = CustomEventP; }
}

if (!g.AbortController) { g.AbortController = AbortControllerP; }
if (!g.AbortSignal) { g.AbortSignal = AbortSignalP; }

if (!g.FileReader) {
    g.FileReader = FileReaderP;
    if (!g.Blob) { g.Blob = BlobP; }
    if (!g.File) { g.File = FileP; }
}

if (!g.URLSearchParams) { g.URLSearchParams = URLSearchParamsP; }
if (!g.FormData) { g.FormData = FormDataP; }
