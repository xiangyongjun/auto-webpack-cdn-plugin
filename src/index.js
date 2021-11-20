const path = require('path');
const request = require('request');
const  { RawSource }  = require('webpack-sources');

class AutoWebpackCdnPlugin {
  constructor(options) {
    this.options = options;
    !this.options.template && (this.options.template = 'index.html');
  }

  apply(compiler) {
    // 忽略打包已替换 cdn 的依赖库
    let externals = compiler.options.externals || {};
    this.options.modules.forEach(item => {
      if (this.getVersionInNodeModules(item.from) && item.to) externals[item.from] = item.to;
    });
    compiler.options.externals = externals;

    // 输出 asset 钩子
    compiler.hooks.emit.tapAsync('auto-webpack-cdn-plugin', (compilation, callback) => {
      this.start(compilation, this.options, callback);
    });
  }

  start(compilation, options, callback) {
    // 注入 cdn 到 html 模板
    for (const name in compilation.assets) {
      if (name === options.template) {
        let contents = compilation.assets[name].source();
        let temp = '';
        let tempf = '';
        let initScript = `<script type="text/javascript" cdn>function loadCSS(e){let new_s=document.createElement('link');new_s.rel='stylesheet';new_s.href=e.getAttribute('backup');document.head.insertBefore(new_s,e);e.remove()}window.onload=()=>{let scripts=[...document.getElementsByTagName('script')];scripts.forEach(item=>{if(item.hasAttribute('cdn'))item.remove();if(item.hasAttribute('backup'))item.remove();if(item.hasAttribute('root')){item.removeAttribute('root');item.removeAttribute('onerror')}});let links=[...document.getElementsByTagName('link')];links.forEach(item=>{if(item.hasAttribute('backup'))item.remove();if(item.hasAttribute('root')){item.removeAttribute('root');item.removeAttribute('onerror')}})};</script>`;
        options.modules.sort((a, b) => {
          if (this.getType(a.path) === 'css' && this.getType(b.path) === 'js') return -1;
        });
        options.modules.forEach(item => {
          let filename = `./backup/${item.from}@${this.getVersionInNodeModules(item.from)}/${item.path}`;
          let url = options.cdnUrl;
          url = url.replace(':name', item.from).replace(':version', this.getVersionInNodeModules(item.from));
          if (item.path.substring(0, 3) !== 'http') item.netpath = `${url}/${item.path}`;
          if (this.getType(filename) === 'js' && !item.final) {
            temp += `<script root type="text/javascript" ${options.crossOrigin ? `crossorigin="${options.crossOrigin}"` : ''}`
              + ` onerror="this.remove();" src="${item.netpath}"></script>`;
            options.backup && (temp += `<script backup>window.${item.to} || document.write(unescape('%3Cscript%20type%3D%22text/javascript%22%20${options.crossOrigin ? `crossorigin%253D"${options.crossOrigin}"%20` : ''}src%3D%22${filename}%22%3E%3C/script%3E'));</script>`);
          }
          if (this.getType(filename) === 'css') temp += `<link rel="stylesheet" ${options.backup ? `backup="${filename}"` : ''} href="${item.netpath}" onerror="loadCSS(this)"></link>`;
          if (this.getType(filename) === 'js' && item.final) {
            tempf += `<script root type="text/javascript" ${options.crossOrigin ? `crossorigin="${options.crossOrigin}"` : ''}`
              + ` onerror="this.remove();" src="${item.netpath}"></script>`;
            options.backup && (tempf += `<script backup>window.${item.to} || document.write(unescape('%3Cscript%20type%3D%22text/javascript%22%20${options.crossOrigin ? `crossorigin%3D%22"${options.crossOrigin}"%20` : ''}src%3D%22${filename}%22%3E%3C/script%3E'));</script>`);
          }
        });
        let withoutComments = contents.replace('</head>', initScript + temp + '</head>');
        withoutComments = withoutComments.replace('</body>', tempf + '</body>');
        compilation.assets[name] = new RawSource(withoutComments);
        break;
      }
    }

    // 如果开启了备份，则下载 cdn 资源到 backup 目录
    let n = 0;
    if (options.backup) {
      let filePath = 'backup';
      for (let i = 0; i < options.modules.length; i++) {
        let item = options.modules[i];
        let dir = `${filePath}/${item.from}@${this.getVersionInNodeModules(item.from)}/${this.getPath(item.path)}`;
        let filename = `${dir}/${this.getFileName(item.path)}`;
        request(item.netpath, (error, response, body) => {
          n++;
          if (error) throw error;
          if (response.statusCode === 200) {
            compilation.assets[filename] = new RawSource(body);
            n === options.modules.length && callback();
          } else {
            throw `下载 ${item.netpath} 文件失败！`;
          }
        });
      }
    }
  }

  // 取完整文件名
  getFileName(o) {
    let pos = o.lastIndexOf('/');
    return o.substring(pos + 1);
  }

  // 获取文件后缀
  getType(file) {
    return file.replace(/.+\./, '');
  }

  // 获取路径
  getPath(o) {
    let pos = o.lastIndexOf('/');
    return o.substring(0, o.length - (o.length - pos));
  }

  // 取模块版本
  getVersionInNodeModules(name, pathToNodeModules = process.cwd()) {
    try {
      return require(path.join(pathToNodeModules, 'node_modules', name, 'package.json')).version;
    } catch (e) {
      return null;
    }
  }
}

module.exports = AutoWebpackCdnPlugin;