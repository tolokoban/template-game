const FS = require("fs")
const Path = require("path")
const package = require("./package.json")
const WorkboxPlugin = require("workbox-webpack-plugin")
const HtmlWebpackPlugin = require("html-webpack-plugin")
const CopyPlugin = require("copy-webpack-plugin")
const { CleanWebpackPlugin } = require("clean-webpack-plugin")
const WebpackShellPluginNext = require("webpack-shell-plugin-next")

module.exports = (env) => {
    if (typeof package.port !== "number") {
        // Define a random port number for dev server.
        package.port = 1204 + Math.floor(Math.random() * (0xffff - 1024))
        FS.writeFileSync(
            Path.resolve(__dirname, "package.json"),
            JSON.stringify(package, null, "    ")
        )
        console.log("A random port has been set for dev server:", package.port)
    }

    const isProdMode = env.WEBPACK_BUILD === true
    if (isProdMode) {
        console.log("+-----------------+")
        console.log("| Production Mode |")
        console.log("+-----------------+")
    }
    return {
        cache: {
            type: "memory",
        },
        output: {
            filename: "scr/[name].[contenthash].js",
            path: Path.resolve(__dirname, "build"),
            devtoolModuleFilenameTemplate: "[absolute-resource-path]",
        },
        entry: {
            app: "./src/index.tsx",
        },
        target: "web",
        resolve: {
            extensions: [".tsx", ".ts", ".js", ".jsx", ".wasm"],
            enforceExtension: false,
            alias: {
                "@": Path.resolve(__dirname, "src"),
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
                overlay: { errors: true, warnings: false },
                progress: true,
            },
            hot: true,
            // Open WebBrowser.
            open: true,
            host: "0.0.0.0",
            port: env.PORT || package.port,
            server: "http",
        },
        stats: {
            colors: true,
            errorDetails: false,
        },
        plugins: [
            new WebpackShellPluginNext({
                onBuildStart: {
                    scripts: ["npm run routes"],
                    blocking: true,
                    parallel: false,
                },
            }),
            new CleanWebpackPlugin({
                // We don't want to remove the "index.html" file
                // after the incremental build triggered by watch.
                cleanStaleWebpackAssets: false,
            }),
            new CopyPlugin({
                patterns: [
                    {
                        from: Path.resolve(__dirname, "public"),
                        filter: async (path) => {
                            return !path.endsWith("index.html")
                        },
                    },
                ],
            }),
            new HtmlWebpackPlugin({
                meta: {
                    viewport:
                        "width=device-width, initial-scale=1, shrink-to-fit=no",
                    "theme-color": "#56abff",
                },
                template: "public/index.html",
                filename: "index.html",
                title: package.name,
                version: package.version,
                minify: {
                    collapseInlineTagWhitespace: true,
                    collapseWhitespace: true,
                    decodeEntities: true,
                    minifyCSS: true,
                    removeComments: true,
                },
            }),
            new WorkboxPlugin.GenerateSW({
                // These options encourage the ServiceWorkers to get in there fast
                // and not allow any straggling "old" SWs to hang around.
                clientsClaim: true,
                skipWaiting: true,
            }),
        ],
        optimization: {
            // Create a single runtime bundle for all chunks.
            runtimeChunk: "single",
            splitChunks: {
                // All the node_modules libs on a single file.
                cacheGroups: {
                    vendor: {
                        test: /[\\/]node_modules[\\/]/,
                        name: "libs",
                        chunks: "all",
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
                    use: [
                        {
                            loader: "ts-loader",
                            options: {
                                transpileOnly: false,
                            },
                        },
                    ],
                    exclude: /node_modules/,
                },
                {
                    test: /\.css$/,
                    use: [
                        {
                            loader: "style-loader",
                            options: {
                                injectType: "styleTag",
                            },
                        },
                        "css-loader",
                    ],
                },
                {
                    test: /\.(png|svg|jpe?g|gif|webp)$/,
                    loader: "url-loader",
                    options: {
                        limit: 8192,
                        name: "img/[name].[contenthash].[ext]",
                    },
                },
                {
                    test: /\.(woff|woff2|eot|ttf|otf)$/,
                    loader: "file-loader",
                    options: {
                        name: "fnt/[contenthash].[ext]",
                    },
                },
                {
                    test: /\.ya?ml$/,
                    type: "json",
                    use: "yaml-loader",
                },
                {
                    test: /\.(vert|frag|txt)$/,
                    use: "raw-loader",
                },
            ],
        },
    }
}
