'use strict';

var gulp = require('gulp');
var proxy = require('proxy-middleware');
var browserSync = require('browser-sync');
var install = require('gulp-install');
var webpack = require('gulp-webpack');
var watch = require('gulp-watch');
var path = require("path");
var fs = require("fs");
var url = require("url");
var del = require('del');

var webpackConfig = {
  watch: true,
  cache: true,
  debug: true,
  progress: true,
  colors: true,
  devtool: 'source-map',
  entry: {
    main: ['./src/js/app.js']
  },
  output: {
    filename: '[name].bundle.js',
    chunkFilename: '[id].chunk.js',
    publicPath: '/js/'
  },
  module: {
    loaders: [
      { test: /\.css$/, loader: "style!css" },
      { test: /\.(eot|woff|woff2|ttf|svg)$/, loader: "url-loader" }
    ]
  },
  resolve: {
    modulesDirectories: ['node_modules'],
  }
};

gulp.task('install', function () {
  gulp.src(['./package.json']).pipe(install());
});

gulp.task('clean', function () {
  del(['target']);
});
gulp.task('default', ['html', 'js', 'browser-sync']);


gulp.task('html', function () {
  return gulp
    .src('src/html/**/*')
    .pipe(watch('src/html/**/*'))
    .pipe(gulp.dest('target'))
    .pipe(browserSync.reload({stream: true}));
});

gulp.task('js', ['webpack']);

gulp.task('webpack', function () {
  return gulp
    .src('src/js/**/*')
    .pipe(watch('src/js/**/*'))
    .pipe(webpack(webpackConfig))
    .pipe(gulp.dest('target/js'))
    .pipe(browserSync.reload({stream: true}));
});

var defaultFile = "index.html";
var folder = path.resolve(__dirname, "target");
gulp.task('browser-sync', function () {
  var proxyOptions = url.parse('http://api.gbif.org/v1');
  proxyOptions.route = '/api';
  // requests to `/api` are proxied to `http://api.gbif.org/v1`

  browserSync({
    port: 3000,
    server: {
      baseDir: './target',
      middleware: [
        proxy(proxyOptions),
        function (req, res, next) {
          var fileName = url.parse(req.url);
          fileName = fileName.href.split(fileName.search).join("");
          var fileExists = fs.existsSync(folder + fileName);
          if (!fileExists && 0 > fileName.indexOf("browser-sync-client")) {
            req.url = "/" + defaultFile;
          }
          return next();
        }

      ]
    }
  });
});
