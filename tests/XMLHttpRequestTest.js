import { suite } from "uvu";
import * as assert from "uvu/assert";
import { ui_rec, testConfig } from "./utils.js";
import { Protagonist, fixXMLHttpRequest } from "./exports.js";

const _name = "XMLHttpRequest";
export const _test = suite(_name);

/**
 * @param {string} n 
 * @param {Parameters<typeof _test>[1]} t 
 */
const test = (n, t) => {
    return _test(...ui_rec(_name, n, t));
}

const mp = { XMLHttpRequest: /** @type {typeof XMLHttpRequest} */ (typeof XMLHttpRequest !== "undefined" && XMLHttpRequest) || undefined };

/**
 * @param {unknown} XHRClass
 */
export function setXMLHttpRequestClass(XHRClass) {
    fixXMLHttpRequest(XHRClass);
    mp.XMLHttpRequest = /** @type {typeof globalThis.XMLHttpRequest} */ XHRClass;
}

test("XMLHttpRequest basic GET request", async () => {
    let XMLHttpRequestClass = mp.XMLHttpRequest || (() => { throw new ReferenceError("XMLHttpRequest is not defined") })();
    let xhr = new XMLHttpRequestClass();
    xhr.open("GET", testConfig.api_prefix + "/api/user?id=88");
    await (new Promise(resolve => {
        xhr.onload = () => { resolve(); }
        xhr.send();
    }));
    assert.equal(xhr.status, 200);
    assert.equal(xhr.getResponseHeader("content-type"), "application/json; charset=utf-8");
    let data = JSON.parse(xhr.responseText);
    assert.equal(data.id, "88");
    assert.equal(data.name, "张三🎉");
    assert.equal(data.age, 25);
});

test("XMLHttpRequest POST request (FormData upload)", async () => {
    let formData = new Protagonist.FormData();
    formData.append("name", "李四");
    formData.append("age", "26");
    let fileContent = "This is the content of the test file.";
    let blob = new Protagonist.Blob([fileContent], { type: "text/plain" });
    formData.append("file", blob, "test-file.txt");

    let XMLHttpRequestClass = mp.XMLHttpRequest || (() => { throw new ReferenceError("XMLHttpRequest is not defined") })();
    let xhr = new XMLHttpRequestClass();
    xhr.open("POST", testConfig.api_prefix + "/api/upload");
    xhr.setRequestHeader("X-Custom-Header", "polyfill-test");
    await (new Promise(resolve => {
        xhr.onload = () => { resolve(); }
        xhr.send(formData);
    }));
    assert.equal(xhr.status, 201);
    let data = JSON.parse(xhr.responseText);
    assert.equal(data.code, 0);
    assert.equal(data.message, "success");
    assert.equal(data.data.name, "李四");
    assert.equal(data.data.age, "26");
    assert.equal(data.data.file.filename, "test-file.txt");
    assert.equal(data.data.file.content, fileContent);
});

test("XMLHttpRequest abort request (AbortController)", async () => {
    let XMLHttpRequestClass = mp.XMLHttpRequest || (() => { throw new ReferenceError("XMLHttpRequest is not defined") })();
    let xhr = new XMLHttpRequestClass();
    xhr.open("GET", testConfig.api_prefix + "/api/timeout");
    let evt = null;
    let abortPromise = new Promise(resolve => { xhr.onabort = e => { evt = e; resolve(); } });
    xhr.send();
    xhr.abort();
    await abortPromise;
    assert.equal(evt && evt.type, "abort");
    assert.not.ok(xhr.responseText);
});

test("XMLHttpRequest dealing with 404 error response", async () => {
    let XMLHttpRequestClass = mp.XMLHttpRequest || (() => { throw new ReferenceError("XMLHttpRequest is not defined") })();
    let xhr = new XMLHttpRequestClass();
    xhr.open("GET", testConfig.api_prefix + "/api/not-found");
    await (new Promise(resolve => {
        xhr.onload = () => { resolve(); }
        xhr.send();
    }));
    assert.equal(xhr.status, 404);
    let data = JSON.parse(xhr.responseText);
    assert.equal(data.code, 404);
    assert.equal(data.message, "Not Found");
});

test("XMLHttpRequest custom request header", async () => {
    let XMLHttpRequestClass = mp.XMLHttpRequest || (() => { throw new ReferenceError("XMLHttpRequest is not defined") })();
    let xhr = new XMLHttpRequestClass();
    xhr.open("GET", testConfig.api_prefix + "/api/header-test");
    xhr.setRequestHeader("X-Token", "123456789");
    xhr.setRequestHeader("Content-Type", "application/json");
    await (new Promise(resolve => {
        xhr.onload = () => { resolve(); }
        xhr.send();
    }));
    let data = JSON.parse(xhr.responseText);
    assert.equal(data.token, "123456789");
    assert.equal(data.contentType, "application/json");
});
