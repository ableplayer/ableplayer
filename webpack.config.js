const path = require("path");

const paths = {
  context: path.join(__dirname, "./scripts/"),
  output: path.join(__dirname, "./")
};

const config = {
  mode: 'production',
  context: paths.context,
  entry: {
    'build/ableplayer': "./index.js",
  },
  output: {
    path: paths.output,
    filename: "[name].js",
    library: "ableplayer",
    libraryTarget: "umd",
    umdNamedDefine: true
  },
  module: {
    rules: [
      {
        test: /\.(js)$/,
        loader: "babel-loader",
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: [".js"],
    modules: [paths.context, "node_modules"],
  },
  externals: {
    jquery: 'jQuery',
    $: 'jQuery',
    Cookies: 'js-cookie'
  }
};

module.exports = config;

