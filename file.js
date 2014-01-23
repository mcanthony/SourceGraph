
var lift = require('lift-result')
var browserModules = require('browser-builtins')
var browserResolve = require('browser-resolve')
var requires = lift(require('detective'))
var toRegex = require('glob-to-regexp')
var resolve = require('resolve-module')
var detect = require('detect/series')
var reduce = require('reduce/series')
var lazy = require('lazy-property')
var fs = require('lift-result/fs')
var extend = require('extensible')
var own = Object.hasOwnProperty
var unique = require('unique')
var Result = require('result')
var map = require('map/async')
var path = require('path')
var when = Result.when
var join = path.join

function File(path){
  this.id = path
}

File.extend = extend
File.cache = Object.create(null)
File.create = function(real){
  var file = this.cache[real]
  if (!(file instanceof File)) {
    file = new this(real)
    File.cache[real] = file
  }
  return file
}

lazy(File.prototype, 'aliases', Array)

lazy(File.prototype, 'transforms', function(){
  var name = this.id
  return when(this.meta, function(meta){
    return when(meta.json, function(pkg){
      var transforms = pkg.transpile || []
      for (var i = 0, len = transforms.length; i < len;) {
        var glob = transforms[i++]
        var mods = transforms[i++]
        if (!match(glob, name)) continue
        if (typeof mods == 'string') mods = [mods]
        return mods.map(resolve.bind(null, path.dirname(name)))
      }
      return []
    })
  })
})

lazy(File.prototype, 'javascript', function(){
  var mods = this.transforms
  var path = this.id
  return when(this.source, function(src){
    return when(mods, function(mods){
      if (!mods) return src
      return reduce(mods, function(src, mod){
        if (typeof mod == 'string') mod = require(mod)
        return mod(src, path)
      }, src)
    })
  })
}, 'enumerable')

lazy(File.prototype, 'source', function(){
  return fs.readFile(this.id, 'utf8')
})

lazy(File.prototype, 'requires', function(){
  return when(requires(this.javascript), unique)
}, 'enumerable')

lazy(File.prototype, 'dependencies', function(){
  var base = path.dirname(this.id)
  var opts = {filename: this.id, modules: browserModules}
  return map(this.requires, function(name){
    var result = new Result
    browserResolve(name, opts, function(e, path){
      if (e) result.error(e)
      else result.write(path)
    })
    return result
  })
}, 'enumerable')

lazy(File.prototype, 'meta', function(){
  var files = parents(path.dirname(this.id)).map(function(dir){
    return join(dir, 'package.json')
  })
  var file = detect(files, function(file){
    return file in File.cache || isFile(file)
  })
  return file
    .then(fs.realpath)
    .then(MetaFile.create)
})

lazy(File.prototype, 'children', function(){
  return map(this.dependencies, function(path){
    return File.cache[path]
    || (File.cache[path] = fs.realpath(path).then(function(real){
      var file = File.create(real)
      // symlink
      if (real != path) {
        file.aliases.push(path)
        File.cache[path] = file
      }
      return file
    }))
  })
})

File.prototype.toJSON = function(){
  var resolved = this.children.value
  return {
    id: this.id,
    source: this.javascript.value,
    aliases: own.call(this, 'aliases') ? this.aliases : undefined,
    deps: this.requires.value.reduce(function(deps, name, i){
      deps[name] = resolved[i].id
      return deps
    }, {})
  }
}

var MetaFile = File.extend()
MetaFile.create = File.create.bind(MetaFile)

lazy(MetaFile.prototype, 'requires', function(){
  return when(this.json, function(pkg){
    var res = [pkg.main || './index']
    if (pkg.extras) res = res.concat(pkg.extras)
    return res.map(function(name){
      if (/^[^.\/]/.test(name)) return './' + name
      return name
    })
  })
})

lazy(MetaFile.prototype, 'json', function(){
  return when(this.source, JSON.parse)
})

function match(glob, file){
  return toRegex(glob).test(file)
}

function isFile(path){
  return fs.stat(path).then(function(stat){
    return stat.isFile()
  }, no)
}

function no(){ return false }

function parents(dir){
  var res = [dir]
  do res.push(dir = path.dirname(dir))
  while (dir != '/')
  return res
}

/**
 * expose File
 */

module.exports = exports = File
exports.Meta = MetaFile
