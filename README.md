# fetch-xhr-shim

A comprehensive polyfill for the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) and its entire ecosystem — `fetch`, `Blob`, `FormData`, `Headers`, `Request`, `Response`, `AbortController`, and more. All network requests go through `XMLHttpRequest` under the hood, so it works anywhere XHR is available: browsers, Node.js, mini-programs, you name it.

When a native implementation exists, it's used directly. When it doesn't, the polyfill kicks in.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
  - [Importing](#importing)
  - [fetch](#fetch)
  - [Request](#request)
  - [Response](#response)
  - [Headers](#headers)
  - [Blob](#blob)
  - [File](#file)
  - [FileReader](#filereader)
  - [URLSearchParams](#urlsearchparams)
  - [FormData](#formdata)
  - [AbortController](#abortcontroller)
  - [EventTarget](#eventtarget)
  - [TextEncoder](#textencoder)
  - [TextDecoder](#textdecoder)
- [Fix Functions](#fix-functions)
  - [fixFetch](#fixfetch)
  - [fixXMLHttpRequest](#fixxmlhttprequest)
  - [fixWebSocket](#fixwebsocket)
- [Auto Import](#auto-import)
- [Node.js](#nodejs)
- [License](#license)

## Features

- **fetch** — Promise-based HTTP client built on `XMLHttpRequest`
- **Request** / **Response** — Full `Request` and `Response` objects
- **Headers** — `Headers` with all standard methods
- **Blob** / **File** — Binary data handling with `Blob` and `File`
- **FileReader** — Read blob/file contents as text, data URL, array buffer, etc.
- **URLSearchParams** — Query string parsing and serialization
- **FormData** — Multipart form construction and parsing
- **AbortController** / **AbortSignal** — Request cancellation
- **EventTarget** / **Event** / **CustomEvent** — DOM event system
- **TextEncoder** / **TextDecoder** — UTF-8 encoding and decoding 

## Installation

```bash
npm install fetch-xhr-shim
```

## Usage

### Importing

To polyfill `globalThis.fetch` and all related APIs automatically:

```js
import "fetch-xhr-shim/polyfill";

fetch("https://www.npmjs.com");
```

If you prefer explicit imports, every module has two export variants:

- The **default export** (e.g. `fetch`) returns the native implementation if available, falling back to the polyfill.
- The **`P`-suffixed export** (e.g. `fetchP`) returns the polyfill implementation directly, bypassing the native check.

```js
import { fetch } from "fetch-xhr-shim";   // native fetch if available, otherwise polyfill
import { fetchP } from "fetch-xhr-shim";   // always the polyfill version
```

This pattern applies to every API: `Blob` / `BlobP`, `FormData` / `FormDataP`, `Headers` / `HeadersP`, and so on.

### fetch

#### Example

```javascript
import { fetch } from "fetch-xhr-shim";

fetch("http://example.com/movies.json")
    .then((response) => response.json())
    .then((data) => console.log(data));
```

#### POST JSON

```javascript
import { fetch } from "fetch-xhr-shim";

const data = { username: "example" };

fetch("https://example.com/profile", {
    method: "POST", // or 'PUT'
    headers: {
        "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
})
    .then((response) => response.json())
    .then((data) => {
        console.log("Success:", data);
    })
    .catch((error) => {
        console.error("Error:", error);
    });
```

#### Upload files

```javascript
import { fetch, File, FormData } from "fetch-xhr-shim";

const formData = new FormData();

formData.append("username", "abc123");
formData.append("file", new File(["foo"], "foo.txt", { type: "text/plain" }));

fetch("https://example.com/profile/avatar", {
    method: "PUT",
    body: formData,
})
    .then((response) => response.json())
    .then((result) => {
        console.log("Success:", result);
    })
    .catch((error) => {
        console.error("Error:", error);
    });
```

> **Under the hood:** `fetch` is built on `XMLHttpRequest`. You can swap in your own XHR implementation — handy for Node.js or custom runtimes.

```javascript
import { setXMLHttpRequestClass } from "fetch-xhr-shim";

setXMLHttpRequestClass(another_XMLHttpRequest_Class);
```

| Syntax | Supported |
|--------|-----------|
| `fetch(resource)` | ✔ |
| `fetch(resource, options)` | ✔ |

> See [Request](#request) for option compatibility.

### Request

#### Example

```javascript
import { fetch, Request } from "fetch-xhr-shim";

const request = new Request("https://www.mozilla.org/favicon.ico");

console.log(request.url);         // "https://www.mozilla.org/favicon.ico"
console.log(request.method);      // "GET"
console.log(request.credentials); // "same-origin"

fetch(request)
    .then((response) => response.blob())
    .then((blob) => {
        console.log(blob);
    });
```

```javascript
import { fetch, Request } from "fetch-xhr-shim";

const request = new Request("https://example.com", {
    method: "POST",
    body: '{"foo": "bar"}',
});

console.log(request.url);         // "https://example.com"
console.log(request.method);      // "POST"
console.log(request.credentials); // "same-origin"
console.log(request.bodyUsed);    // false

fetch(request)
    .then((response) => {
        if (response.status === 200) {
            return response.json();
        } else {
            throw new Error("Something went wrong on API server!");
        }
    })
    .then((data) => {
        console.debug(data);
    })
    .catch((error) => {
        console.error(error);
    });
```

#### Compatibility

**Properties**

| Property | Supported |
|----------|-----------|
| `body` | ✖ |
| `bodyUsed` | ✔ |
| `cache` | ✔ |
| `credentials` | ✔ |
| `destination` | ✖ |
| `headers` | ✔ |
| `integrity` | ✖ |
| `keepalive` | ✖ |
| `method` | ✔ |
| `mode` | ✖ |
| `redirect` | ✖ |
| `referrer` | ✖ |
| `referrerPolicy` | ✖ |
| `signal` | ✔ |
| `url` | ✔ |

**Methods**

| Method | Supported |
|--------|-----------|
| `arrayBuffer()` | ✔ |
| `blob()` | ✔ |
| `bytes()` | ✔ |
| `clone()` | ✔ |
| `formData()` | ✔ |
| `json()` | ✔ |
| `text()` | ✔ | 

### Response

#### Example

```javascript
import { Response, Blob, fetch } from "fetch-xhr-shim";

const myBlob = new Blob();
const myOptions = { status: 200, statusText: "SuperSmashingGreat!" };
const myResponse = new Response(myBlob, myOptions);
```

#### Compatibility

**Properties**

| Property | Supported |
|----------|-----------|
| `body` | ✖ |
| `bodyUsed` | ✔ |
| `headers` | ✔ |
| `ok` | ✔ |
| `redirected` | ✖ |
| `status` | ✔ |
| `statusText` | ✔ |
| `type` | ✖ |
| `url` | ✔ |

**Methods**

| Method | Supported |
|--------|-----------|
| `arrayBuffer()` | ✔ |
| `blob()` | ✔ |
| `bytes()` | ✔ |
| `clone()` | ✔ |
| `formData()` | ✔ |
| `json()` | ✔ |
| `text()` | ✔ | 

### Headers

#### Example

```javascript
import { Headers, fetch } from "fetch-xhr-shim";

const myHeaders = new Headers();

myHeaders.append("Content-Type", "text/plain");
myHeaders.get("Content-Type"); // 'text/plain'

fetch("https://www.test.com/headers", {
    headers: myHeaders,
});
```

You can also pass an object or an array of pairs to the constructor:

```javascript
import { Headers } from "fetch-xhr-shim";

let myHeaders = new Headers({
    "Content-Type": "text/plain",
});

// or, using an array of arrays:
myHeaders = new Headers([["Content-Type", "text/plain"]]);

myHeaders.get("Content-Type"); // 'text/plain'
```

#### Compatibility

| Method | Supported |
|--------|-----------|
| `append(name, value)` | ✔ |
| `delete(name)` | ✔ |
| `entries()` | ✔ |
| `forEach(callbackFn)` | ✔ |
| `forEach(callbackFn, thisArg)` | ✔ |
| `get(name)` | ✔ |
| `getSetCookie()` | ✖ |
| `has(name)` | ✔ |
| `keys()` | ✔ |
| `set(name, value)` | ✔ |
| `values()` | ✔ | 

### Blob

#### Example

#### Create a blob

```javascript
import { Blob, fetch } from "fetch-xhr-shim";

const obj = { hello: "world" };
const blob = new Blob([JSON.stringify(obj, null, 2)], {
    type: "application/json",
});

const another_blob = new Blob(["Hello, World!"], {
    type: "text/plain"
});

fetch("https://www.test.com/blob", {
    method: "POST",
    body: another_blob,
});
```

#### Extract data from a blob

```javascript
import { Blob, FileReader, fetch } from "fetch-xhr-shim";

const blob = new Blob([JSON.stringify({ foo: "bar" })], {
    type: "application/json",
});

const reader = new FileReader();
reader.addEventListener("loadend", () => {
  // reader.result contains the contents of blob as a typed array
});
reader.readAsArrayBuffer(blob);

fetch("https://www.test.com/blob", {
    method: "POST",
    body: blob,
})
    .then(r => r.blob())
    .then(r => {
        const reader2 = new FileReader();
        reader2.onload = () => {
            // reader2.result
        }
        reader2.readAsDataURL(r);   // base64
    });
```

> If you call `blob.stream()` in an environment without `ReadableStream`, you can inject your own implementation:

```javascript
import { setReadableStreamClass } from "fetch-xhr-shim";

setReadableStreamClass(another_ReadableStream_Class);
```

#### Compatibility

**Properties**

| Property | Supported |
|----------|-----------|
| `size` | ✔ |
| `type` | ✔ |

**Methods**

| Method | Supported |
|--------|-----------|
| `arrayBuffer()` | ✔ |
| `bytes()` | ✔ |
| `slice()` | ✔ |
| `slice(start)` | ✔ |
| `slice(start, end)` | ✔ |
| `slice(start, end, contentType)` | ✔ |
| `stream()` | ✔ |
| `text()` | ✔ | 

### File

#### Example

```javascript
import { File } from "fetch-xhr-shim";

const file = new File(["foo"], "foo.txt", {
    type: "text/plain",
});
```

#### Compatibility

| Property | Supported |
|----------|-----------|
| `lastModified` | ✔ |
| `name` | ✔ |
| `webkitRelativePath` | ✖ | 

### FileReader

#### Example

```javascript
import { File, FileReader } from "fetch-xhr-shim";

const file = new File([JSON.stringify({ foo: "bar" })], "test.json", {
    type: "application/json",
});

// Read the file
const reader = new FileReader();
reader.onload = () => {
    console.log(reader.result);
};
reader.readAsText(file);
```

#### Compatibility

**Properties**

| Property | Supported |
|----------|-----------|
| `error` | ✔ |
| `readyState` | ✔ |
| `result` | ✔ |

**Methods**

| Method | Supported | Notes |
|--------|-----------|-------|
| `abort()` | ✔ | simulated |
| `readAsArrayBuffer()` | ✔ | |
| `readAsBinaryString()` | ✔ | |
| `readAsDataURL()` | ✔ | |
| `readAsText()` | ✔ | UTF-8 only | 

### URLSearchParams

#### Example

```javascript
import { URLSearchParams, fetch } from "fetch-xhr-shim";

const paramsString = "q=URLUtils.searchParams&topic=api";
const searchParams = new URLSearchParams(paramsString);

// Iterating the search parameters
for (const p of searchParams) {
    console.log(p);
}

console.log(searchParams.has("topic")); // true
console.log(searchParams.has("topic", "fish")); // false
console.log(searchParams.get("topic") === "api"); // true
console.log(searchParams.getAll("topic")); // ["api"]
console.log(searchParams.get("foo") === null); // true
searchParams.append("topic", "webdev");
console.log(searchParams.toString()); // "q=URLUtils.searchParams&topic=api&topic=webdev"
searchParams.set("topic", "More webdev");
console.log(searchParams.toString()); // "q=URLUtils.searchParams&topic=More+webdev"
searchParams.delete("topic");
console.log(searchParams.toString()); // "q=URLUtils.searchParams"

// GET
fetch("https://www.test.com/get" + `?${searchParams.toString()}`);

// POST
fetch("https://www.test.com/post", {
    method: "POST",
    body: searchParams,
});
```

#### From an object

Search params can also be initialized from a plain object.

```javascript
import { URLSearchParams } from "fetch-xhr-shim";

const paramsObj = { foo: "bar", baz: "bar" };
const searchParams = new URLSearchParams(paramsObj);

console.log(searchParams.toString()); // "foo=bar&baz=bar"
console.log(searchParams.has("foo")); // true
console.log(searchParams.get("foo")); // "bar"
```

#### Compatibility

**Properties**

| Property | Supported |
|----------|-----------|
| `size` | ✔ |

**Methods**

| Method | Supported |
|--------|-----------|
| `append(name, value)` | ✔ |
| `delete(name)` | ✔ |
| `delete(name, value)` | ✔ |
| `entries()` | ✔ |
| `forEach(callback)` | ✔ |
| `forEach(callback, thisArg)` | ✔ |
| `get(name)` | ✔ |
| `getAll(name)` | ✔ |
| `has(name)` | ✔ |
| `has(name, value)` | ✔ |
| `keys()` | ✔ |
| `set(name, value)` | ✔ |
| `sort()` | ✔ |
| `toString()` | ✔ |
| `values()` | ✔ | 

### FormData

#### Example

```javascript
import { FormData, fetch } from "fetch-xhr-shim";

const formData = new FormData();
formData.append("username", "Chris");

const file = new File(["Hello, World!"], "file.txt", {
    type: "text/plain",
});
formData.append("file", file);

fetch("https://www.test.com/formdata", {
    method: "POST",
    body: formData,
});
```

#### Compatibility

**Constructors**

| Constructor | Supported |
|-------------|-----------|
| `new FormData()` | ✔ |
| `new FormData(form)` | ✔ |
| `new FormData(form, submitter)` | ✖ |

**Methods**

| Method | Supported |
|--------|-----------|
| `append(name, value)` | ✔ |
| `append(name, value, filename)` | ✔ |
| `delete(name)` | ✔ |
| `entries()` | ✔ |
| `get(name)` | ✔ |
| `getAll(name)` | ✔ |
| `has(name)` | ✔ |
| `keys()` | ✔ |
| `set(name, value)` | ✔ |
| `set(name, value, filename)` | ✔ |
| `values()` | ✔ | 

### AbortController

#### Example

```javascript
import { AbortController, fetch } from "fetch-xhr-shim";

const controller = new AbortController();

fetch("https://www.test.com/abort", {
    signal: controller.signal,
});
```

```javascript
import { AbortController, AbortSignal, Request, fetch } from "fetch-xhr-shim";

async function get() {
    const controller = new AbortController();
    const request = new Request("https://example.org/get", {
        signal: controller.signal,
    });

    const response = await fetch(request);
    controller.abort();
    // The next line will throw `AbortError`
    const text = await response.text();
    console.log(text);
}
```

#### Compatibility

**AbortController**

| Member | Supported |
|--------|-----------|
| `signal` (property) | ✔ |
| `abort()` | ✔ |
| `abort(reason)` | ✔ |

**AbortSignal**

| Member | Supported |
|--------|-----------|
| `aborted` (property) | ✔ |
| `reason` (property) | ✔ |
| `throwIfAborted()` | ✔ | 

### EventTarget

#### Example

```javascript
import { EventTarget, Event, CustomEvent } from "fetch-xhr-shim";

const target = new EventTarget();

target.addEventListener("foo", function (evt) {
    console.log(evt);
});

const evt = new Event("foo");
target.dispatchEvent(evt);

target.addEventListener("animalfound", function (evt) {
    console.log(evt.detail.name);
});

const catFound = new CustomEvent("animalfound", {
    detail: {
        name: "cat",
    },
});
target.dispatchEvent(catFound);
```

#### Compatibility

| Method | Supported |
|--------|-----------|
| `addEventListener(type, listener)` | ✔ |
| `addEventListener(type, listener, options)` | ✔ |
| `addEventListener(type, listener, useCapture)` | ✔ |
| `dispatchEvent(event)` | ✔ |
| `removeEventListener(type, listener)` | ✔ |
| `removeEventListener(type, listener, options)` | ✔ |
| `removeEventListener(type, listener, useCapture)` | ✔ | 

### TextEncoder

#### Example

```javascript
import { TextEncoder } from "fetch-xhr-shim";

const encoder = new TextEncoder();
const encoded = encoder.encode("€");

console.log(encoded); // Uint8Array(3) [226, 130, 172]
```

#### Compatibility

| Member | Supported | Notes |
|--------|-----------|-------|
| `encoding` (property) | ✔ | `"utf-8"` |
| `encode(string)` | ✔ | |
| `encodeInto(string, uint8Array)` | ✔ | | 

### TextDecoder

#### Example

```javascript
import { TextDecoder } from "fetch-xhr-shim";

const utf8decoder = new TextDecoder(); // default 'utf-8'
const encodedText = new Uint8Array([240, 160, 174, 183]);

console.log(utf8decoder.decode(encodedText)); // 𠮷
```

#### Compatibility

| Member | Supported | Notes |
|--------|-----------|-------|
| `encoding` (property) | ✔ | UTF-8 only |
| `fatal` (property) | ✔ | |
| `ignoreBOM` (property) | ✔ | |
| `decode()` | ✔ | |
| `decode(buffer)` | ✔ | |
| `decode(buffer, options)` | ✔ | | 

## Fix Functions

### fixFetch

Wraps a native `fetch` so it can accept polyfill `Blob`, `FormData`, `Request`, and `Headers` objects as input. Useful when you have a native `fetch` but want to pass polyfill types to it.

```javascript
import { fixFetch } from "fetch-xhr-shim";

const _fetch = fixFetch();   // You can also pass a specific fetch function to fix.
_fetch("https://www.npmjs.com");
```

### fixXMLHttpRequest

Patches `XMLHttpRequest.prototype` so the native XHR can send polyfill `Blob` and `FormData` bodies.

```javascript
import { fixXMLHttpRequest } from "fetch-xhr-shim";

fixXMLHttpRequest();   // You can also pass a specific XHR class to fix.
```

### fixWebSocket

Patches `WebSocket.prototype` so the native WebSocket can send polyfill `Blob` data.

```javascript
import { fixWebSocket } from "fetch-xhr-shim";

fixWebSocket();   // You can also pass a specific WebSocket class to fix.
```

## Auto Import

See [unplugin-auto-import](https://www.npmjs.com/package/unplugin-auto-import) for more details.

```javascript
// for reference only
AutoImport({
    // other configs

    imports: [
        // other imports

        {
            "fetch-xhr-shim": [
                "TextEncoder",
                "TextDecoder",

                "EventTarget",
                "Event",
                "CustomEvent",

                "AbortController",
                "AbortSignal",

                "Blob",
                "File",
                "FileReader",

                "URLSearchParams",
                "FormData",

                "fetch",
                "Headers",
                "Request",
                "Response",
            ],
        },

        // other imports
    ],

    // other configs
});
```

## Node.js

By providing an `XMLHttpRequest` implementation, the polyfill `fetch` works in any environment — not just browsers.

For example, using the `xhr2` package:

```bash
npm install xhr2
```

```javascript
import XMLHttpRequest from "xhr2";
import { setXMLHttpRequestClass } from "fetch-xhr-shim";

setXMLHttpRequestClass(XMLHttpRequest);
```

## License

MIT

---

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
