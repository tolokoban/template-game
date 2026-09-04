import Package from "./package.json" with { type: "json" }
import Path from "path"
import FS from "fs"
import { CleanWebpackPlugin } from "clean-webpack-plugin"
import remarkImages from "remark-images"
import remarkEmoji from "remark-emoji"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import rehypeHighlightCodeLines from "rehype-highlight-code-lines"
import highlightJs from "highlight.js"
import WebpackShellPluginNext from "webpack-shell-plugin-next"
import Rspack from "@rspack/core"
import { GenerateSW } from "workbox-webpack-plugin"
import path from "path"

const __dirname = path.dirname(new URL(import.meta.url).pathname)

export default (env) => {
    if (typeof Package.port !== "number") {
        // Define a random port number for dev server.
        Package.port = 1204 + Math.floor(Math.random() * (0xffff - 1024))
        FS.writeFileSync(
            Path.resolve(__dirname, "package.json"),
            JSON.stringify(Package, null, "    ")
        )
        console.log("A random port has been set for dev server:", Package.port)
    }

    // Rspack v2's CLI passes `RSPACK_BUILD` (v1 used the webpack-inherited
    // `WEBPACK_BUILD` name); keep both so this keeps working across versions.
    const isProdMode = env.RSPACK_BUILD === true || env.WEBPACK_BUILD === true
    if (isProdMode) {
        console.log("+-----------------+")
        console.log("| Production Mode |")
        console.log("+-----------------+")
    }
    return {
        cache: false,
        // cache: {
        //     type: "memory",
        // },
        output: {
            filename: "scr/[name].[contenthash].js",
            path: Path.resolve(__dirname, "build"),
            devtoolModuleFilenameTemplate: "[absolute-resource-path]",
        },
        watchOptions: {
            aggregateTimeout: 600,
        },
        entry: {
            app: "./src/index.tsx",
        },
        target: "web",
        resolve: {
            extensions: [".tsx", ".ts", ".js", ".jsx", ".wasm"],
            enforceExtension: false,
            alias: {
                "@": Path.resolve(__dirname, "src/"),
            },
        },
        devtool: isProdMode ? false : "inline-source-map",
        devServer: {
            compress: true,
            historyApiFallback: true,
            static: {
                directory: Path.resolve(__dirname, "./public"),
            },
            client: {
                logging: "none",
                overlay: { errors: false, warnings: false },
                progress: true,
            },
            hot: true,
            // Open WebBrowser.
            open: true,
            host: "0.0.0.0",
            port: env.PORT || Package.port,
            server: "http",
        },
        stats: {
            children: true,
            colors: true,
            errorDetails: false,
        },
        plugins: [
            new Rspack.ProgressPlugin(),
            new WebpackShellPluginNext({
                onBeforeCompile: {
                    scripts: ["npm run generate"],
                    blocking: true,
                    parallel: false,
                },
            }),
            // // List of the needed files for later caching.
            // new WebpackManifestPlugin({
            //     filter: (file) => {
            //         if (file.name.endsWith(".map")) return false
            //         if (file.name.endsWith(".ts")) return false
            //         return true
            //     },
            // }),
            new CleanWebpackPlugin({
                // We don't want to remove the "index.html" file
                // after the incremental build triggered by watch.
                cleanStaleWebpackAssets: false,
            }),
            new Rspack.CopyRspackPlugin({
                patterns: [
                    {
                        from: "*",
                        context: Path.resolve(__dirname, "public"),
                        globOptions: {
                            ignore: ["**/index.html"],
                        },
                    },
                ],
            }),
            new Rspack.HtmlRspackPlugin({
                template: "public/index.html",
                filename: "index.html",
                templateParameters: {
                    version: Package.version,
                    title: "Tolokoban",
                },
                minify: isProdMode,
            }),
            new Rspack.CssExtractRspackPlugin(),
            new GenerateSW({
                clientsClaim: true,
                skipWaiting: true,
            }),
        ],
        performance: {
            hints: "warning",
            maxAssetSize: 300000,
            maxEntrypointSize: 200000,
            assetFilter: (filename) => {
                // PNG are just fallbacks for WEBP images.
                if (filename.endsWith(".png")) return false
                if (filename.endsWith(".map")) return false
                return true
            },
        },
        optimization: {
            splitChunks: {
                chunks: "all",
                cacheGroups: {
                    defaultVendors: {
                        test: /[\\/]node_modules[\\/]/,
                        priority: -10,
                        reuseExistingChunk: true,
                    },
                    default: {
                        minChunks: 2,
                        priority: -20,
                        reuseExistingChunk: true,
                    },
                },
            },
            // Prevent "libs.[contenthash].js" from changing its hash if not needed.
            moduleIds: "deterministic",
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    loader: "builtin:swc-loader",
                    options: {
                        jsc: {
                            parser: { syntax: "typescript", tsx: true },
                            transform: { react: { runtime: "automatic" } },
                        },
                    },
                    exclude: /node_modules/,
                },
                // {
                //     test: /\.tsx?$/,
                //     loader: "esbuild-loader",
                //     options: {
                //       loader: "tsx", // Or 'ts' if you don't need tsx
                //       target: "es2015",
                //     },
                // },
                {
                    test: /\.(png|jpe?g|gif|webp|avif|svg)$/i,
                    // More information here https://webpack.js.org/guides/asset-modules/
                    type: "asset",
                    generator: {
                        filename: "img/[name].[hash][ext][query]",
                    },
                },
                {
                    test: /\.(bin|glb|dat|swc)$/i,
                    // More information here https://webpack.js.org/guides/asset-modules/
                    type: "asset",
                    generator: {
                        filename: "bin/[name].[hash][ext][query]",
                    },
                },
                {
                    test: /\.(eot|ttf|woff|woff2)$/i,
                    // More information here https://webpack.js.org/guides/asset-modules/
                    type: "asset/resource",
                    generator: {
                        filename: "fnt/[name].[hash][ext][query]",
                    },
                },
                {
                    test: /\.(vert|frag|obj)$/i,
                    // More information here https://webpack.js.org/guides/asset-modules/
                    type: "asset/source",
                },
                {
                    test: /\.(py|txt|sh|md)$/i,
                    // More information here https://webpack.js.org/guides/asset-modules/
                    type: "asset/source",
                },
                {
                    test: /\.css$/,
                    use: [
                        {
                            loader: Rspack.CssExtractRspackPlugin.loader,
                            options: {},
                        },
                        {
                            loader: "css-loader",
                            options: {
                                modules: {
                                    auto: true,
                                    namedExport: false,
                                    // Without this, css-loader's default convention for
                                    // `namedExport: false` is "camel-case-only", which lowercases
                                    // the first letter of PascalCase class names (e.g. `.Button`
                                    // becomes `button`) and drops the original name entirely.
                                    // @tolokoban/ui relies on accessing PascalCase class names
                                    // as-is (e.g. `Styles.Button`), so keep them unchanged.
                                    exportLocalsConvention: "asIs",
                                    localIdentName: isProdMode
                                        ? "[hash:base64]"
                                        : "[path][name]_[local]_[hash:base64:6]",
                                },
                            },
                        },
                    ],
                },
                {
                    test: /\.mdx?$/,
                    use: [
                        { loader: "builtin:swc-loader", options: {} },
                        {
                            loader: "@mdx-js/loader",
                            /** @type {import('@mdx-js/loader').Options} */
                            options: {
                                rehypePlugins: [
                                    [
                                        rehypeHighlight,
                                        {
                                            languages: {
                                                ts: () =>
                                                    highlightJs.getLanguage(
                                                        "ts"
                                                    ),
                                                glsl: () =>
                                                    highlightJs.getLanguage(
                                                        "glsl"
                                                    ),
                                            },
                                        },
                                    ],
                                    rehypeHighlightCodeLines,
                                ],
                                remarkPlugins: [
                                    remarkImages,
                                    remarkEmoji,
                                    remarkGfm,
                                ],
                                providerImportSource: "@mdx-js/react",
                            },
                        },
                    ],
                },
            ],
        },
    }
}
