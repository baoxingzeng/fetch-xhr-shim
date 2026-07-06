import { copyFileSync } from "node:fs";
import { dts } from "rollup-plugin-dts";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";

export default [
    // CommonJS
    {
        input: ["src/index.ts", "src/dev.ts", "src/polyfill.ts"],
        output: {
            dir: "dist/cjs",
            format: "cjs",
            preserveModules: true,
        },
        plugins: [
            typescript({
                outDir: "dist/cjs",
                declarationDir: "dist/cjs/types",
                ignoreDeprecations: "6.0",
            }),
        ],
    },

    // CommonJS (singlefile)
    {
        input: "src/index.ts",
        output: {
            file: "dist/fetch-xhr-shim.cjs.js",
            format: "cjs",
        },
        plugins: [
            typescript({
                declarationDir: "dist/types",
                ignoreDeprecations: "6.0",
            }),
        ],
    },

    // CommonJS (singlefile, minimized)
    {
        input: "src/index.ts",
        output: {
            file: "dist/fetch-xhr-shim.cjs.min.js",
            format: "cjs",
        },
        plugins: [
            typescript({
                declarationDir: "dist/types",
                ignoreDeprecations: "6.0",
            }),
            terser(),
        ],
    },

    // ES6
    {
        input: ["src/index.ts", "src/dev.ts", "src/polyfill.ts"],
        output: {
            dir: "dist/esm",
            format: "es",
            preserveModules: true,
        },
        plugins: [
            typescript({
                outDir: "dist/esm",
                declarationDir: "dist/esm/types",
                ignoreDeprecations: "6.0",
            }),
        ],
    },

    // ES6 (singlefile)
    {
        input: "src/index.ts",
        output: {
            file: "dist/fetch-xhr-shim.esm.js",
            format: "es",
        },
        plugins: [
            typescript({
                declarationDir: "dist/types",
                ignoreDeprecations: "6.0",
            }),
        ],
    },

    // ES6 (singlefile, minimized)
    {
        input: "src/index.ts",
        output: {
            file: "dist/fetch-xhr-shim.esm.min.js",
            format: "es",
        },
        plugins: [
            typescript({
                declarationDir: "dist/types",
                ignoreDeprecations: "6.0",
            }),
            terser(),
        ],
    },

    // IIFE (polyfill singlefile)
    {
        input: "src/polyfill.ts",
        output: {
            file: "dist/fetch-xhr-shim.polyfill.iife.js",
            format: "iife",
            // name: "PolyfillFetch",
        },
        plugins: [
            typescript({
                target: "es5",
                declarationDir: "dist/types",
                ignoreDeprecations: "6.0",
            }),
            (function copyPolyfill() {
                return {
                    name: "copy-polyfill",
                    closeBundle() {
                        copyFileSync("dist/fetch-xhr-shim.polyfill.iife.js", "polyfill.js");
                    },
                };
            })(),
        ],
    },

    // IIFE (polyfill singlefile, minimized)
    {
        input: "src/polyfill.ts",
        output: {
            file: "dist/fetch-xhr-shim.polyfill.iife.min.js",
            format: "iife",
            // name: "PolyfillFetch",
        },
        plugins: [
            typescript({
                target: "es5",
                declarationDir: "dist/types",
                ignoreDeprecations: "6.0",
            }),
            terser(),
        ],
    },

    // Types
    {
        input: "dist/esm/types/index.d.ts",
        output: {
            file: "dist/index.d.ts",
            format: "es",
        },
        plugins: [dts()],
    },

    // Types (dev)
    {
        input: "dist/esm/types/dev.d.ts",
        output: {
            file: "dist/dev.d.ts",
            format: "es",
        },
        plugins: [dts()],
    },
];
