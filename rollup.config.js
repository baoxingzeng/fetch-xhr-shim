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

    // CommonJS (minimized)
    {
        input: "src/index.ts",
        output: {
            file: "dist/fetch-xhr.cjs.min.js",
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

    // ES6 (minimized)
    {
        input: "src/index.ts",
        output: {
            file: "dist/fetch-xhr.esm.min.js",
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
