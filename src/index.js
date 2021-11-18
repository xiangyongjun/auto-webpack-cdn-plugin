const path = require('path');
const fs = require('fs');
const request = require('request');

class AutoWebpackCdnPlugin {
  constructor(options) {
    this.options = options;
    !this.options.template && (this.options.template = 'index.html');
  }

  apply(compiler) {
    // 忽略打包已替换 cdn 的依赖库
    let externals = compiler.options.externals || {};
    this.options.modules.forEach(item => {
      if (getVersionInNodeModules(item.from) && item.to) externals[item.from] = item.to;
    });
    compiler.options.externals = externals;

    // 打包后完成后，如果开启了备份，则下载 cdn 资源到 backup 目录
    compiler.hooks.done.tap('auto-webpack-cdn-plugin', stats => {
      if ((this.options.backup && process.env.NODE_ENV === 'production')) {
        let filePath = stats.compilation.options.output.path;
        if (fs.existsSync(filePath)) {
          filePath += '/backup';
          this.options.modules.forEach(item => {
            let dir = `${filePath}/${item.from}@${getVersionInNodeModules(item.from)}`;
            mkdirsSync(dir);
            let filename = `${dir}/${getFileName(item.path)}`;
            if (!fs.existsSync(filename)) {
              let stream = fs.createWriteStream(filename);
              request(item.path).pipe(stream);
            }
          });
        }
      }
    });

    // 注入 cdn 到 html 模板
    compiler.hooks.emit.tap('auto-webpack-cdn-plugin', compilation => {
      for (const name in compilation.assets) {
        if (name === this.options.template) {
          let contents = compilation.assets[name].source();
          let temp = '';
          let initScript = `<script type=\"text/javascript\" cdn>var totalScript=#totalScript#;function loadCSS(e){let new_s=document.createElement('link');new_s.rel='stylesheet';new_s.href=e.getAttribute('backup');document.head.insertBefore(new_s,e);e.remove()}function loadScript(e){let new_s=document.createElement('script');new_s.src=e.getAttribute('backup');e.hasAttribute('crossorigin')&&new_s.setAttribute(e.getAttribute('crossorigin'));document.head.insertBefore(new_s,e);new_s.onload=loadSuccess.call(e);e.remove()}let loadSuccess=(function(){let loadedScript=0;return function(){this.getAttribute('onload')&&this.removeAttribute('onload');this.getAttribute('onerror')&&this.removeAttribute('onerror');this.getAttribute('backup')&&this.removeAttribute('backup');if(this.tagName!=='SCRIPT'){return}loadedScript++;if(loadedScript===totalScript){document.open();document.write('#bodyContent#');document.close();loadedScript=null;let scripts=[...document.getElementsByTagName('script')];scripts.forEach(item=>{if(item.hasAttribute('cdn')){item.remove()}})}}})();</script>`;
          let bodyContent = contents.substring(contents.indexOf('<body>') + 6, contents.indexOf('</body>'));
          let totalScript = this.options.modules.filter(item => getType(item.path) === 'js').length;
          initScript = initScript.replace('#bodyContent#', bodyContent).replace('#totalScript#', totalScript);
          this.options.modules.sort((a, b) => {
            if (getType(a.path) === 'css' && getType(b.path) === 'js') return -1;
          });
          this.options.modules.forEach(item => {
            let filename = './backup/' + getFileName(item.path);
            let url = this.options.cdnUrl;
            url = url.replace(':name', item.from).replace(':version', getVersionInNodeModules(item.from));
            if (item.path.substring(0, 3) !== 'http') item.path = `${url}/${item.path}`;
            if (getType(filename) === 'js') temp += `<script type="text/javascript" ${this.options.crossOrigin ? `crossorigin="${this.options.crossOrigin}"` : ''}`
              + ` ${this.options.backup ? `backup="${filename}"` : ''} onload="loadSuccess.call(this)" onerror="loadScript(this)" src="${item.path}"></script>`;
            if (getType(filename) === 'css') temp += `<link rel="stylesheet" ${this.options.backup ? `backup="${filename}"` : ''} onload="loadSuccess.call(this)" onerror="loadCSS(this)" href="${item.path}"></link>`;
          });
          let withoutComments = contents.replace('</head>', initScript + temp + '</head>');
          withoutComments = withoutComments.replace(bodyContent, '');
          compilation.assets[name] = {
            source: () => withoutComments,
            size: () => withoutComments.length
          };
          break;
        }
      }
    });

    // 取完整文件名
    function getFileName(o) {
      let pos = o.lastIndexOf('/');
      return o.substring(pos + 1);
    }

    // 获取文件后缀
    function getType(file) {
      return file.replace(/.+\./, '');
    }

    // 取模块版本
    function getVersionInNodeModules(name, pathToNodeModules = process.cwd()) {
      try {
        return require(path.join(pathToNodeModules, 'node_modules', name, 'package.json')).version;
      } catch (e) {
        return null;
      }
    }

    // 递归创建目录 同步方法
    function mkdirsSync(dirname) {
      if (fs.existsSync(dirname)) {
        return true;
      } else {
        if (mkdirsSync(path.dirname(dirname))) {
          fs.mkdirSync(dirname);
          return true;
        }
      }
    }
  }
}

module.exports = AutoWebpackCdnPlugin;