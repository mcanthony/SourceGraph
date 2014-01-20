
var read = require('./utils').read
var chai = require('./chai')
var path = require('path')
var Graph = require('..')
var fs = require('fs')
var graph

beforeEach(function(){
  graph = new Graph().use('nodeish', 'css')
})

describe('add(path)', function(){
  var base = __dirname + '/fixtures/simple'
  var p1 = base+'/index.js'
  var p2 = base+'/has_dependency.js'

  it('will simply fetch the file and include it', function(done){
    graph.add(p1).then(function (files) {
      Object.keys(files).should.have.a.lengthOf(1)
      files[p1].text.should.equal(read(p1))
    }).node(done)
  })

  it('can load dependencies', function(done){
    graph.add(p2).then(function (files) {
      Object.keys(files).should.have.a.lengthOf(2)
      files[p1].text.should.equal(read(p1))
      files[p2].text.should.equal(read(p2))
    }).node(done)
  })
})

describe('which(base, name)', function(){
  it('should resolve a relative path', function(){
    var base = __dirname + '/fixtures/simple'
    var p1 = base+'/index.js'
    var p2 = base+'/has_dependency.js'
    graph.graph[p1] = {}
    graph.graph[p2] = {}
    graph.which(base, './index').should.equal(p1)
    graph.which(base, './has_dependency').should.equal(p2)
  })

  it('should resolve a magic path', function(){
    var base = __dirname+'/fixtures/node/expandsingle'
    var p2 = base+'/node_modules/foo.js'
    graph.graph[p2] = {}
    graph.which(base, 'foo').should.equal(p2)
  })
})

it('can define custom handlers', function(done) {
  var p = __dirname + '/fixtures/non_js/example.rndom'

  function Rndom (file) {
    this.text = file.text
    this.path = file.path
    this.requires = function(){ return [] }
  }
  Rndom.test = function(file){
    if (file.path.match(/\.rndom$/)) return 1
  }
  graph
    .addType(Rndom)
    .add(p)
    .then(function(data){
      should.exist(data)
      data.should.have.property(p)
        .and.property('text', read(p, 'utf-8'))
    }).node(done)
})

it('should not fail on files it doesn\'t have a type for', function(done){
  var p = __dirname + '/fixtures/non_js/example.rndom'
  graph.add(p).then(function(data){
    should.exist(data)
    data.should.have.property(p)
      .and.have.property('requires').and.eql([])
  }).node(done)
})

describe('symlinks', function(){
  var dir = __dirname+'/fixtures/symlinks'
  var linked = __dirname+'/fixtures/node/expandsingle/node_modules/foo.js'
  it('should follow the link but register the alias', function(done){
    graph.add(dir+'/index.js').then(function(files){
      files.should.include.keys([
        dir+'/index.js',
        linked
      ])
      files[linked].should.have.property('aliases')
        .and.deep.equal([dir+'/sym.js'])
    }).node(done)
  })

  it('should be able to collect several aliases', function(done){
    graph.add(dir+'/multi.js').then(function(files){
      files.should.include.keys([
        dir+'/multi.js',
        linked
      ])
      files[linked].should.have.property('aliases')
        .and.include.members([dir+'/sym.js', dir+'/sym2.js'])
    }).node(done)
  })

  it('should handle real files within fake directories', function(done){
    var entry = __dirname + '/fixtures/symlinks/simple.js'
    var real1 = __dirname + '/fixtures/simple/index.js'
    var alias = __dirname + '/fixtures/symlinks/simple/has_dependency.js'
    var real2 = __dirname + '/fixtures/simple/has_dependency.js'
    graph.add(entry).then(function (files) {
      files.should.contain.keys([entry, real1, real2])
      files.should.have.property(alias, files[real2])
        .and.have.property('aliases').and.eql([alias])
    }).node(done)
  })
})
