
var core = require('browser-builtins')
var File = require('../file')

it('.source', function(done){
  var file = fixture('simple.js')
  new File(file).source.should.become(read(file)).notify(done)
})

describe('.meta', function(){
  it('should find package.json in same directory', function(done){
    new File(fixture('simple.js')).meta.then(function(file){
      file.path.should.eql(fixture('package.json'))
    }).node(done)
  })

  it('up multiple directories', function(done){
    new File(fixture('node_modules/one/index.js'))
      .meta.then(function(file){
        file.path.should.eql(fixture('package.json'))
      }).node(done)
  })
})

describe('.transforms', function(){
  it('should resolve to a list of modules', function(done){
    new File(fixture('compose.trans'))
      .transforms.should.become([
        fixture('node_modules/to-object-transform.js'),
        fixture('node_modules/simple-transform.js')
      ]).notify(done)
  })
})

describe('.javascript', function(){
  it('should be enumerable', function(){
    var file = new File
    file.javascript = ''
    file.should.include.key('javascript')
  })

  it('no transforms', function(done){
    var file = fixture('simple.js')
    new File(file).javascript.should.become(read(file)).notify(done)
  })

  it('single transform', function(done){
    var file = fixture('simple.trans')
    new File(file).javascript.should.become(read(file) + file).notify(done)
  })

  it('multiple transforms', function(done){
    var file = fixture('compose.trans')
    new File(file).javascript
      .should.become(JSON.stringify({src: read(file), id: file}) + file)
      .notify(done)
  })
})

describe('.requires', function(){
  it('empty', function(){
    var file = new File(fixture('simple.js'))
    file.javascript = ''
    file.requires.should.eql([])
  })

  it('static requires', function(){
    var file = new File(fixture('simple.js'))
    file.javascript = 'require("./");require("a")'
    file.requires.should.eql(['./', 'a'])
  })
})

describe('.dependencies', function(){
  it('should resolve relative dependencies', function(done){
    new File(fixture('main.js')).dependencies
      .should.become([fixture('simple.js')])
      .notify(done)
  })

  it('should resolve naked modules', function(done){
    new File(fixture('r-naked-mod.js')).dependencies
      .should.become([fixture('node_modules/two.js')])
      .notify(done)
  })

  it('should resolve an implicit "index.js" module', function(done){
    new File(fixture('r-index-mod.js')).dependencies
      .should.become([fixture('node_modules/one/index.js')])
      .notify(done)
  })

  it('should resolve the main file in a package', function(done){
    new File(fixture('r-main-mod.js')).dependencies
      .should.become([fixture('node_modules/three/main.js')])
      .notify(done)
  })

  it('should resolve node core modules', function(done){
    new File(fixture('node-core.js')).dependencies
      .should.become([
        core['fs'],
        core['http'],
        core['dns'],
        core['path']
      ])
      .notify(done)
  })
})

describe('.children', function(){
  it('should be an array of Files', function(done){
    new File(fixture('main.js')).children.then(function(arr){
      arr.should.have.a.lengthOf(1)
      arr[0].should.have.property('path', fixture('simple.js'))
    }).node(done)
  })
})