*Important：Please read the readme file carefully to achieve the best optimization effect, otherwise it will lead to project packaging and running errors.* 

# auto-webpack-cdn-plugin

> A `webpack` plugin that can replace `node_module` dependencies with `cdn` resources, and supports automatic switching to local backup dependencies when `cdn` fails.

[中文](https://github.com/xiangyongjun/auto-webpack-cdn-plugin/blob/main/README.md) | English

## Introduction
`auto-webpack-cdn-plugin` Only need simple configuration, that is, you can replace the dependent resources used in the project with CDN resources, and support CDN dependent backup. When packaging, it will automatically download the corresponding version of the resource on CDN for local backup. When CDN fails, it will automatically switch to local Dependence, to solve the pain points of small water pipe server users.

## Functions and Advantages
* Reduce the loading time of the first screen.
* Reduce the burden of server bandwidth, improve site access speed, and the effect of small water pipe server is better.
* The configuration is simple and convenient, and does not depend on other `webpack` plugins.
* You can add `final: true` to dependencies that are not needed on the first screen, and the dependencies will be loaded after the first screen is rendered, speeding up the loading speed of the first screen.
* Automatically back up `cdn` dependent modules when packaging. When `cdn` fails, the local dependent modules will be automatically switched to prevent the website from being blown up with `cdn`.

## Install
```shell
$ npm install auto-webpack-cdn-plugin  --save-dev
```

## Usage example
```javascript
const AutoWebpackCdnPlugin = require('auto-webpack-cdn-plugin');

module.exports = {
  // ...
  plugins: [
    new AutoWebpackCdnPlugin({
        template: 'index.html', // html template to be injected into cdn.
        cdnUrl: 'https://unpkg.zhimg.com/:name@:version', // cdn address + name + version.
        // cdnUrl: 'https://cdn.bootcdn.net/ajax/:name/:version',
        backup: true, // Open local backup, when cdn fails, load the local dependency package.
        crossOrigin: 'anonymous', // script tag cross-domain attribute, can be omitted.
        // cdn resource to be injected.
        modules: [
          { from: 'vue', to: 'Vue', path: 'dist/vue.min.js' },
          { from: 'vue-router', to: 'VueRouter', path: 'dist/vue-router.min.js' },
          { from: 'vuex', to: 'Vuex', path: 'dist/vuex.min.js' },
          { from: 'axios', to: 'axios', path: 'dist/axios.min.js' },
          { from: 'element-ui', to: 'Element', path: 'lib/index.js' },
          { from: 'moment', to: 'moment', path: 'min/moment.min.js', final: true },
          { from: 'js-cookie', to: 'Cookies', path: 'dist/js.cookie.min.js' },
          { from: 'nprogress', to: 'NProgress', path: 'nprogress.js' },
          { from: 'element-ui', path: 'lib/theme-chalk/index.css' },
          { from: 'normalize.css', path: 'normalize.css' },
        ],
        // from (module name), to (name of the global object exported by the module, css can be omitted), path (resource path, complete url can be filled in), final (load after first screen rendering, css can be omitted).
    })
  ]
  // ...
};
```

## Precautions
```javascript
# src/main.js
import Vue from 'vue';
import VueRouter from 'vue-router';
import Vuex from 'vuex';

if (!window.VueRouter) Vue.use(VueRouter);
if (!window.Vuex) Vue.use(VueRouter);

// When the dependency that needs to be replaced is Vue.use(), you need to manually add the judgment statement if(!window. The global object name exported by the module), otherwise the operation will report an error.
```

## Realization principle
1. Extract the `body` code of the `html` template and inject the `<script cdn></script>` code.
2. Inject `script` and `link` tags (bound with `onload` and `onerror` events) to the `html` template.
3. When `webpack` is packaged, download the corresponding `cdn` resources to the local `backup` directory.
4. When the tag's `onerror` event is executed, `src` and `href` will replace local resources.
5. When the tag's `onload` event is executed, the counter is incremented by 1, and when the counter is equal to the number of injected `script`, the code of the extracted `body` is written to `<body></body>`, At this time the first screen content starts to load, the `script` tag with the `final` tag will be loaded after the first screen is rendered, and finally all the label attributes such as `onload`, `onerror`, `backup`, and `final` are cleared, and Clear `<script cdn></script>`.
```html
<!-- The code used to switch local resources when the cdn fails, all injected scripts will be removed after loading -->
<script cdn>/* ... */</script>

<!-- After the label is loaded, the counter increments by 1. -->
<script onload="loadSuccess.call(this)"></script>

<!-- After the label fails to load, src and href will be replaced with local resources. -->
<script onerror="loadCSS(this)"></script>

<!-- Used to record the local resource address. -->
<script backup="./backup/xxx"></script>

<!-- Load after first screen rendering. -->
<script final></script>
```

HTML template injected into CDN
```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Dynamic CDN</title>
    <!-- The following is the injected code -->
    <script cdn>/* The code used to switch local resources when the cdn fails, all injected scripts will be removed after loading. */</script>
    <link rel="stylesheet" onload="loadSuccess.call(this)" backup="./backup/element-ui@2.15.6/index.css" onerror="loadCSS(this)" href="https://unpkg.zhimg.com/element-ui@2.15.6/lib/theme-chalk/index.css">
    <script type="text/javascript" crossorigin="anonymous" backup="./backup/vue@2.6.10/vue.min.js" onload="loadSuccess.call(this)" onerror="loadScript(this)" src="https://unpkg.zhimg.com/vue@2.6.10/dist/vue.min.js"></script>
    <!-- ... -->
  </head>
  <body>
    <!-- The following code is extracted, and the body code is written when all the injected scripts of the head are loaded. -->
    <!-- 
      <div id="app"></div>
      ...
      <script type="text/javascript" crossorigin="anonymous" backup="./backup/moment@2.29.1/moment.min.js" onload="loadSuccess.call(this)" onerror="loadScript(this)" src="https://unpkg.zhimg.com/moment@2.29.1/min/moment.min.js" final></script>
    -->
  </body>
</html>
```

Rendered HTML
```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Dynamic CDN</title>
    <!-- The following is the successfully loaded cdn resource. -->
    <link rel="stylesheet" href="https://unpkg.zhimg.com/element-ui@2.15.6/lib/theme-chalk/index.css">
    <script type="text/javascript" crossorigin="anonymous" src="https://unpkg.zhimg.com/vue@2.6.10/dist/vue.min.js"></script>
    <!-- ... -->
  </head>
  <body>
    <div id="app">
      <!-- The node mounted by el, the content rendered by the render function, the following is the final: true script. -->
      <script type="text/javascript" crossorigin="anonymous" src="https://unpkg.zhimg.com/moment@2.29.1/min/moment.min.js"></script>
    </div>
  </body>
</html>
```

Automatically switch local resources after CDN fails
```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Dynamic CDN</title>
    <!-- The following are the resources that have been switched to local. -->
    <link rel="stylesheet" href="./backup/element-ui@2.15.6/index.css">
    <script type="text/javascript" crossorigin="anonymous" src="./backup/vue@2.6.10/vue.min.js"></script>
    <!-- ... -->
  </head>
  <body>
    <div id="app">
      <!-- The node mounted by el, the content rendered by the render function, the following is the final: true script. -->
      <script type="text/javascript" crossorigin="anonymous" src="./backup/moment@2.29.1/moment.min.js"></script>
    </div>
  </body>
</html>
```