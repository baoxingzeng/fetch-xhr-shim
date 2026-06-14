import { suite } from "uvu";
import * as assert from "uvu/assert";
import { ui_rec, isTargetType } from "./utils.js";
import { Protagonist, Subordinate } from "./exports.js";

const _name = "FileReader";
export const _test = suite(_name);

/**
 * @param {string} n 
 * @param {Parameters<typeof _test>[1]} t 
 */
const test = (n, t) => {
    return _test(...ui_rec(_name, n, t));
}

test("FileReader initialization state and event", () => {
    let reader = new Protagonist.FileReader();
    assert.equal(reader.readyState, Protagonist.FileReader.EMPTY);
    assert.equal(reader.readyState, 0);
    assert.equal(Protagonist.FileReader.EMPTY, 0);
    assert.equal(Protagonist.FileReader.LOADING, 1);
    assert.equal(Protagonist.FileReader.DONE, 2);
    assert.equal(reader.result, null);
    assert.equal(reader.error, null);
    let handler = () => { };
    reader.addEventListener("load", handler);
    reader.removeEventListener("load", handler);
    reader.onload = handler;
    reader.onload = null;
});

test("readAsText read the text content of File/Blob", async () => {
    let textFile = new Subordinate.File(["Hello FileReader🎉"], "text.txt", { type: "text/plain;charset=utf-8" });
    let reader1 = new Protagonist.FileReader();
    let loadPromise1 = new Promise(resolve => { reader1.addEventListener("load", evt => { resolve(evt); }, { once: true }); });
    reader1.readAsText(textFile);
    assert.equal(reader1.readyState, Protagonist.FileReader.LOADING);
    await loadPromise1;
    assert.equal(reader1.readyState, Protagonist.FileReader.DONE);
    assert.equal(reader1.result, "Hello FileReader🎉");
    assert.equal(reader1.error, null);
    let blob = new Subordinate.Blob(["小程序"], { type: "text/plain" });
    let reader2 = new Protagonist.FileReader();
    let loadPromise2 = new Promise(resolve => { reader2.addEventListener("load", evt => { resolve(evt); }, { once: true }); });
    reader2.readAsText(blob, "utf-8");
    await loadPromise2;
    assert.equal(reader2.result, "小程序");
    let emptyFile = new Subordinate.File([], "empty.txt");
    let reader3 = new Protagonist.FileReader();
    let loadPromise3 = new Promise(resolve => { reader3.addEventListener("load", evt => { resolve(evt); }, { once: true }); });
    reader3.readAsText(emptyFile);
    await loadPromise3;
    assert.equal(reader3.result, "");
});

test("readAsArrayBuffer read binary content", async () => {
    let uint8 = new Uint8Array([72, 101, 108, 108, 111]);
    let binFile = new Subordinate.File([uint8], "binary.dat", { type: "application/octet-stream" });
    let reader = new Protagonist.FileReader();
    let loadPromise = new Promise(resolve => { reader.onload = evt => { resolve(evt); } });
    reader.readAsArrayBuffer(binFile);
    await loadPromise;
    assert.equal(reader.readyState, Protagonist.FileReader.DONE);
    let resultAb = reader.result;
    assert.ok(isTargetType("ArrayBuffer", resultAb));   // Mini Program
    let resultU8 = new Uint8Array(resultAb);
    assert.equal(resultU8.length, 5);
    assert.equal(resultU8[0], 72);
    assert.equal(resultU8[4], 111);
});

test("readAsDataURL read as DataURL", async () => {
    let textFile = new Subordinate.File(["Hello"], "text.txt", { type: "text/plain" });
    let reader1 = new Protagonist.FileReader();
    let loadPromise1 = new Promise(resolve => { reader1.addEventListener("load", evt => { resolve(evt); }, { once: true }); });
    reader1.readAsDataURL(textFile);
    await loadPromise1;
    let dataUrl1 = reader1.result;
    assert.type(dataUrl1, "string");
    assert.ok(dataUrl1.startsWith("data:text/plain;base64,"));
    assert.equal(dataUrl1.split(",")[1], "SGVsbG8=");
    let binBlob = new Subordinate.Blob([new Uint8Array([0x00, 0x01, 0x02])], { type: "application/octet-stream" });
    let reader2 = new Protagonist.FileReader();
    let loadPromise2 = new Promise(resolve => { reader2.addEventListener("load", evt => { resolve(evt); }, { once: true }); });
    reader2.readAsDataURL(binBlob);
    await loadPromise2;
    let dataUrl2 = reader2.result;
    assert.ok(dataUrl2.startsWith("data:application/octet-stream;base64,"));
    assert.equal(dataUrl2.split(",")[1], "AAEC");
});

test("abort interrupt file reading", async () => {
    let bigFile = new Subordinate.File(["a".repeat(100000)], "big.txt");
    let reader = new Protagonist.FileReader();
    let abortPromise = new Promise(resolve => { reader.onabort = evt => resolve(evt); });
    reader.readAsText(bigFile);
    reader.abort();
    await abortPromise;
    assert.equal(reader.readyState, Protagonist.FileReader.DONE);
    assert.equal(reader.result, null);
    assert.instance(reader.error, Error);
});

test("FileReader event triggering sequence", async () => {
    let file = new Subordinate.File(["test"], "event.txt");
    let reader = new Protagonist.FileReader();
    let events = [];
    ["loadstart", "load", "loadend"].forEach(event => {
        reader.addEventListener(event, () => events.push(event));
    });
    let loadendPromise = new Promise(resolve => { reader.onloadend = evt => resolve(evt); });
    reader.readAsText(file);
    await loadendPromise;
    assert.equal(events.join(","), "loadstart,load,loadend");
});
