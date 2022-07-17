import gulp from "gulp";
import browser from 'browser-sync';

// Плагины

import fileInclude from "gulp-file-include";
import htmlMin from 'gulp-htmlmin';
import size from 'gulp-size';
import plumber from 'gulp-plumber';
import notify from 'gulp-notify'
import del from 'del';
import autoprefixer from 'gulp-autoprefixer';
import csso from 'gulp-csso';
import rename from 'gulp-rename';
import dartSass from 'sass';
import gulpSass from 'gulp-sass';
import babel from 'gulp-babel';
import imagemin, {gifsicle, mozjpeg, optipng, svgo} from "gulp-imagemin";
import newer from 'gulp-newer';
import webp from 'gulp-webp';
import webpHtml from 'gulp-webp-retina-html';
import webpCss from 'gulp-webp-css-fixed';
import gulpIf from 'gulp-if';
import sourcemaps from 'gulp-sourcemaps';
import svgstore from 'gulp-svgstore';
import posthtml from 'gulp-posthtml';
import include from 'posthtml-include';

const browserSync = browser.create();
const sass = gulpSass(dartSass);

const isProd = process.argv.includes("--prod");
const isDev = !isProd;


// Удаление директории

const clear = function () {
  return del("./build");
}

// Обработка HTML
const html = function () {
  return gulp.src("./src/*.html")
    .pipe(plumber({
      errorHandler: notify.onError(error => ({
        title: "HTML",
        message: error.message
      }))
    }))
    .pipe(posthtml([include()]))
    .pipe(fileInclude())
    .pipe(size({title: "До сжатия"}))
    .pipe(gulpIf(isProd, htmlMin({
      collapseWhitespace: isProd
    })))
    .pipe(size({title: "После сжатия"}))
    .pipe(webpHtml({
      retina: {
        1: '',
        2: '@2x'
      },
    }))
    .pipe(gulp.dest("./build"))
    .pipe(browserSync.stream());
}


// Обработка SCSS

const scss = function () {
  return gulp.src("./src/sass/style.scss")
    .pipe(plumber({
      errorHandler: notify.onError(error => ({
        title: "SCSS",
        message: error.message
      }))
    }))
    .pipe(gulpIf(isDev, sourcemaps.init()))
    .pipe(sass())
    .pipe(webpCss({}))
    .pipe(autoprefixer({grid: true}))
    .pipe(size({title: "До сжатия"}))
    .pipe(gulp.dest("./build/css"))
    .pipe(csso())
    .pipe(rename({suffix: ".min"}))
    .pipe(size({title: "После сжатия"}))
    .pipe(gulpIf(isDev, sourcemaps.write('.')))
    .pipe(gulp.dest("./build/css"))
}

// Обработка JS

const js = function () {
  return gulp.src("./src/js/main.js", {sourcemaps: isDev})
    .pipe(plumber({
      errorHandler: notify.onError(error => ({
        title: "JS",
        message: error.message
      }))
    }))
    .pipe(babel({
      presets: ['@babel/env']
    }))
    .pipe(rename({suffix: '.min'}))
    .pipe(gulp.dest("./build/js", {sourcemaps: isDev}))
}


// Обработка изображений

const images = function () {
  return gulp.src("./src/img/**/*.{png,jpg,svg}")
    .pipe(plumber({
      errorHandler: notify.onError(error => ({
        title: "Images",
        message: error.message
      }))
    }))
    .pipe(newer("./build/img"))
    .pipe(gulpIf(isProd, imagemin([
        gifsicle({interlaced: true}),
        mozjpeg({quality: 75, progressive: true}),
        optipng({optimizationLevel: 2}),
        svgo({
          plugins: [
            {
              name: 'removeViewBox',
              active: false
            },
            {
              name: 'removeRasterImages',
              active: true
            },
            {
              name: 'removeUselessStrokeAndFill',
              active: false
            },
          ]
        })
      ],
      {
        verbose: true
      })))
    .pipe(gulp.dest("./build/img"))
}

const webP = function () {
  return gulp.src('./src/img/**/*.{png,jpg}')
    .pipe(plumber({
      errorHandler: notify.onError(error => ({
        title: "webp",
        message: error.message
      }))
    }))
    .pipe(newer("./build/img"))
    .pipe(webp({quality: 90}))
    .pipe(gulp.dest("./build/img"))
}

const sprite = function () {
  return gulp.src('src/img/icon-*.svg')
    .pipe(svgstore({
      inlineSvg: true
    }))
    .pipe(rename('sprite.svg'))
    .pipe(gulp.dest('build/img'));
}

// Копирование Шрифтов
const copy = function () {
  return gulp.src("./src/fonts/**/*.{woff,woff2}")
    .pipe(gulp.dest("./build/fonts"))
}

// Сервер
const server = function () {
  browserSync.init({
    server: {
      baseDir: "build/"
    }
  })
}

// Наблюдение
const watcher = function () {
  gulp.watch("src/*.html", gulp.series(html, sprite)).on("all", browserSync.reload);
  gulp.watch("src/sass/**/*.scss", scss).on("all", browserSync.reload);
  gulp.watch("src/js/*.js", js).on("all", browserSync.reload);
  gulp.watch("src/img/**/*.{png,jpg,svg}", images).on("all", browserSync.reload);
  gulp.watch("src/img/**/*.{png,jpg,svg}", gulp.series(sprite, html)).on("all", browserSync.reload);
}


const build = gulp.series(
  clear,
  sprite,
  gulp.parallel(html, scss, js, images, webP, copy)
)

const dev = gulp.series(
  build,
  gulp.parallel(watcher, server)
);

// Задачи
export {html, scss, sprite};

//Сборка
export default isProd ? build : dev;
