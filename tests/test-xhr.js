import server from "./mock-server.js";
import XMLHttpRequest from "xhr2";
import { _test as XMLHttpRequest_suite, setXMLHttpRequestClass } from "./XMLHttpRequestTest.js";

setXMLHttpRequestClass(XMLHttpRequest);
XMLHttpRequest_suite.after(() => server.close());
XMLHttpRequest_suite.run();
