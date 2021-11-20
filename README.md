*重要：* 请认真阅读完本篇自述文件，将能达到最佳优化效果，否则将导致项目打包、运行出错。

# auto-webpack-cdn-plugin

> 一个可以将 `node_module` 依赖替换成 `cdn` 资源的 `webpack` 插件，而且支持 `cdn` 失效时自动切换到本地备份的依赖。

## 简介
`auto-webpack-cdn-plugin` 只需要简单配置，即可以将项目中使用到的依赖资源替换成 cdn 资源，并且支持 cdn 依赖备份，打包的时候自动下载 cdn 上对应版本的资源进行本地备份，当 cdn 失效时会自动切换成本地的依赖，解决小水管服务器用户的痛点。

## 作用与优势
* 减少首屏加载时间。
* 减轻服务器带宽负担，提高站点访问速度，小水管服务器效果更佳。
* 配置简单便捷，不依赖其他 `webpack` 插件。
* 可以将首屏不需要的依赖加上 `final: true` ，将会在首屏渲染后加载依赖，加快首屏加载速度。
* 打包时自动备份 `cdn` 依赖模块，当 `cdn` 失效时，会自动切换本地依赖模块，防止网站跟着 `cdn` 一起炸掉。

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
        cdnUrl: 'https://unpkg.zhimg.com/:name@:version', // cdn 地址 + 名称 + 版本
        // cdnUrl: 'https://cdn.bootcdn.net/ajax/:name/:version',
        backup: true, // 开启本地备份，当 cdn 失效，则加载本地依赖包
        crossOrigin: 'anonymous', // script 标签跨域属性，可省略
        // 欲注入的 cdn 资源
        modules: [
          { from: 'vue', to: 'Vue', path: 'dist/vue.min.js' },
          { from: 'vue-router', to: 'VueRouter', path: 'dist/vue-router.min.js' },
          { from: 'vuex', to: 'Vuex', path: 'dist/vuex.min.js' },
          { from: 'axios', to: 'axios', path: 'dist/axios.min.js' },
          { from: 'element-ui', to: 'ELEMENT', path: 'lib/index.js' },
          { from: 'js-cookie', to: 'Cookies', path: 'dist/js.cookie.min.js' },
          { from: 'nprogress', to: 'NProgress', path: 'nprogress.js' },
          { from: 'moment', to: 'moment', path: 'min/moment.min.js', final: true },
          { from: 'element-ui', path: 'lib/theme-chalk/index.css' },
          { from: 'element-ui', path: 'lib/theme-chalk/fonts/element-icons.ttf' },
          { from: 'element-ui', path: 'lib/theme-chalk/fonts/element-icons.woff' },
          { from: 'normalize.css', path: 'normalize.css' },
        ],
        // from（模块名称），to（模块导出的全局对象名称，css可略），path（资源路径，可填入完整 url），final（首屏渲染后加载，css可略）
    })
  ]
  // ...
};
```

## 注意事项
```javascript
# src/main.js
import Vue from 'vue';
import VueRouter from 'vue-router';
import Vuex from 'vuex';

if (!window.VueRouter) Vue.use(VueRouter);
if (!window.Vuex) Vue.use(VueRouter);

// 当需要被替换的依赖被 Vue.use() 时，需要手动加上判断语句 if(!window.模块导出的全局对象名称) ，否则运行将会报错
```

## 执行流程
注入 CDN 后的 HTML 模板
```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>动态 CDN</title>
    <!-- 以下是注入的代码 -->
    <script cdn>/* 用于 cdn 失效时切换本地资源的代码，清除注入的标签属性，以及清除失效的 script 、 link 标签 */</script>
    <link root rel="stylesheet" backup="./backup/element-ui@2.15.6/index.css" onerror="loadCSS(this)" href="https://unpkg.zhimg.com/element-ui@2.15.6/lib/theme-chalk/index.css">
    <script root type="text/javascript" crossorigin="anonymous" onerror="this.remove();" src="https://unpkg.zhimg.com/vue@2.6.10/dist/vue.min.js"></script>
    <script backup>window.Vue || document.write(unescape('%3Cscript%20type%3D%22text/javascript%22%20crossorigin%3D%22anonymous%20src%3D%22./backup/vue@2.6.10/dist/vue.min.js%22%3E%3C/script%3E'));</script>
    <!-- 剩余省略 -->
  </head>
  <body>
      <div id="app"></div>
      ...
      <!-- 以下是注入的 final: true 的代码 -->
      <script root type="text/javascript" crossorigin="anonymous" onerror="this.remove();" src="https://unpkg.zhimg.com/moment@2.29.1/min/moment.min.js"></script>
      <script backup>window.moment || document.write(unescape('%3Cscript%20type%3D%22text/javascript%22%20crossorigin%3D%22anonymous%20src%3D%22./backup/vue@2.6.10/dist/vue.min.js%22%3E%3C/script%3E'));</script>
  </body>
</html>
```

渲染后的 HTML
```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>动态 CDN</title>
    <!-- 以下是成功加载的 cdn 资源 -->
    <link rel="stylesheet" href="https://unpkg.zhimg.com/element-ui@2.15.6/lib/theme-chalk/index.css">
    <script type="text/javascript" crossorigin="anonymous" src="https://unpkg.zhimg.com/vue@2.6.10/dist/vue.min.js"></script>
    <!-- 剩余省略 -->
  </head>
  <body>
    <div id="app">
      ...
      <!-- 以下是成功加载的 final: true 的代码 -->
      <script type="text/javascript" crossorigin="anonymous" src="https://unpkg.zhimg.com/moment@2.29.1/min/moment.min.js"></script>
    </div>
  </body>
</html>
```

CDN 失效后自动切换本地资源
```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>动态 CDN</title>
    <!-- 以下是已经切换成本地的资源 -->
    <link rel="stylesheet" href="./backup/element-ui@2.15.6/index.css">
    <script type="text/javascript" crossorigin="anonymous" src="./backup/vue@2.6.10/vue.min.js"></script>
    <!-- 剩余省略 -->
  </head>
  <body>
    <div id="app">
      ...
      <!-- 以下是成功加载的 final: true 的代码 -->
      <script type="text/javascript" crossorigin="anonymous" src="./backup/moment@2.29.1/min/moment.min.js"></script>
    </div>
  </body>
</html>
```