'use strict';

let _ = require('lodash');
let expandPath = require('./expandPath');
let path = require('path');

class TachyonConfig {
  constructor(filePath){
    this.path = expandPath(filePath);
    this.dir = path.dirname(this.path);
    this.load();
  }

  load(){
    this.module = _.defaults(require(this.path), {
      projectDir: expandPath(process.cwd()),
      testDir: './tests'
    });
  }

  reload(){
    delete require.cache[this.path];
    this.load();
  }
}


module.exports = TachyonConfig;