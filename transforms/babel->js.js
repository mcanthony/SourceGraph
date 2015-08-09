var babel = require('babel-core')
var path = require('path')
var plugin = path.dirname(require.resolve('babel-plugin-runtime/package'))

module.exports = function(es6, path, options) {
  options = Object.create(options)
  options.filename = path
  // currently only works when installed with npm and not
  // symlinked so needs to be off by default
  if (options.abspaths) {
    options.plugins = options.plugins
      ? options.plugins.concat(plugin)
      : [plugin]
  }
  return babel.transform(es6, options).code
}
