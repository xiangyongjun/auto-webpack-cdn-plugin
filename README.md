*重要：* 请认真阅读完本篇自述文件，否则将导致项目打包、运行出错。

# auto-webpack-cdn-plugin

> 一个可以将 node_module 依赖替换成 cdn 资源的 webpack 插件，而且支持 cdn 失效时自动切换到本地备份的依赖。

## 简介
`auto-webpack-cdn-plugin` 只需要简单配置，即可以将项目中使用到的依赖资源替换成 cdn 资源，并且支持 cdn 依赖备份，打包的时候自动下载 cdn 上对应版本的资源进行本地备份，当 cdn 失效时会自动切换成本地的依赖，解决小水管服务器用户的痛点。

## 安装
```shell
$ npm install auto-webpack-cdn-plugin  --save-dev
```

## 使用示例
```javascript
const AutoWebpackCdnPlugin = require('auto-webpack-cdn-plugin');

module.exports = {
  // ...
  plugins: [
    new AutoWebpackCdnPlugin({
        template: 'index.html', // 欲注入 cdn 的 html 模板
        cdnUrl: 'https://unpkg.zhimg.com/:name@:version', // cdn 地址模板
        // cdnUrl: 'https://cdn.bootcdn.net/ajax/:name/:version',
        backup: true, // 开启本地备份，当 cdn 失效，则加载本地依赖包
        crossOrigin: 'anonymous', // script 标签跨域属性，可省略
        // 欲注入的 cdn 依赖
        modules: [
          { from: 'vue', to: 'Vue', path: 'dist/vue.min.js' },
          { from: 'vue-router', to: 'VueRouter', path: 'dist/vue-router.min.js' },
          { from: 'vuex', to: 'Vuex', path: 'dist/vuex.min.js' },
          { from: 'axios', to: 'axios', path: 'dist/axios.min.js' },
          { from: 'element-ui', to: 'Element', path: 'lib/index.js' },
          { from: 'moment', to: 'moment', path: 'min/moment.min.js' },
          { from: 'js-cookie', to: 'Cookies', path: 'dist/js.cookie.min.js' },
          { from: 'nprogress', to: 'NProgress', path: 'nprogress.js' },
          { from: 'element-ui', path: 'lib/theme-chalk/index.css' },
          { from: 'normalize.css', path: 'normalize.css' },
        ],
        // from（依赖名称），to（导出的函数名称，css可略），path（资源路径，可填入完整 url）
    })
  ]
  // ...
};
```

注入 CDN 后的 HTML 模板
```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>APP</title>
    <!-- 以下是注入的代码 -->
    <script cdn>/* 用于 cdn 失效时切换本地依赖的代码，所有 js 加载完毕后会自动移除 */</script>
    <link rel="stylesheet" onload="loadSuccess.call(this)" backup="./backup/index.css" onerror="loadCSS(this)" href="https://unpkg.zhimg.com/element-ui@2.15.6/lib/theme-chalk/index.css">
    <script type="text/javascript" crossorigin="anonymous" backup="./backup/vue.min.js" onload="loadSuccess.call(this)" onerror="loadScript(this)" src="https://unpkg.zhimg.com/vue@2.6.10/dist/vue.min.js"></script>
    <!-- 剩余略 -->
  </head>
  <body>
    <!-- 此处代码被清空，当所有 js 依赖加载完毕时后再写入 body 代码 -->
  </body>
</html>
```

渲染后的 HTML
```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>APP</title>
    <!-- 以下是成功加载的 cdn 资源 -->
    <link rel="stylesheet" href="https://unpkg.zhimg.com/element-ui@2.15.6/lib/theme-chalk/index.css">
    <script type="text/javascript" crossorigin="anonymous" src="https://unpkg.zhimg.com/vue@2.6.10/dist/vue.min.js"></script>
    <!-- 剩余略 -->
  </head>
  <body>
    <div id="app">
      <!-- el 挂载的节点， render 函数渲染后的内容 -->
    </div>
  </body>
</html>
```

CDN 失效后自动切换本地依赖
```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>APP</title>
    <!-- 以下是已经切换成本地的依赖 -->
    <link rel="stylesheet" href="./backup/index.css">
    <script type="text/javascript" crossorigin="anonymous" src="./backup/vue.min.js"></script>
    <!-- 剩余略 -->
  </head>
  <body>
    <div id="app">
      <!-- el 挂载的节点， render 函数渲染后的内容 -->
    </div>
  </body>
</html>
```

## 注意
```javascript
# src/main.js
import Vue from 'vue';
import VueRouter from 'vue-router';
import Vuex from 'vuex';

if (!window.VueRouter) Vue.use(VueRouter);
if (!window.Vuex) Vue.use(VueRouter);

// 当需要被替换的依赖被 Vue.use() 时，需要手动加上判断语句 !window.导出的函数名称，否则运行将会报错
```