'use strict';

let _ = require('lodash');
let fs = require('fs');
let bb = require('bluebird');
let watchman = require('fb-watchman');
let path = require('path');
let uuid = require('node-uuid').v4;
let childProcess = require('child_process');
let errors = require('./errors');

let client = new watchman.Client();

bb.promisifyAll(client);

function handleError(error){
  console.error('Error initiating watch:', error);
  console.error(error.stack);
  return;
}

function subscriptionSuccess(dir, resp){
  console.log(`
    subscription established: ${resp.subscribe}
      - ${dir}
  `);
}

function shutdown(signal) {
  return function(){
    console.log(`recieved: [${signal}]`);
    process.exit();
  };
}

function subscribeToProcessSignals(signals, signalCb) {
  signals = signals || [
    'SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGABRT', 'SIGTERM',
  ];
  signals.forEach(function(s){
    process.on(s, signalCb(s));
  });
}

function mapTestFiles(testDir) {
  return function(f) {
    return path.join(testDir, f.name);
  };
}

function listTestFiles(f){
  let exists = fs.existsSync(f);
  return `\n\t${f}: ${exists ? 'exists' : 'missing'}\n`;
}

function filterMissing(f) {
  return fs.existsSync(f);
}

module.exports = function watch(opts){

  if (!opts.query) {
    throw new Error(errors.missingQuery);
  }

  if (!opts.command) {
    throw new Error(errors.missingCommand);
  }

  opts.resTestDir = path.resolve(opts.testDir);

  // Initiate the watch

  let watchProj =client.commandAsync(['watch-project', opts.projectDir]);
  let watchTests = client.commandAsync(['watch-project', opts.resTestDir]);
  let subProj = client.commandAsync(['subscribe', opts.projectDir, uuid(), {
    expression: opts.query,
    fields: ['name', 'size', 'exists', 'type']
  }]).then(subscriptionSuccess.bind(null, opts.projectDir));

  let subTests = client.commandAsync(['subscribe', opts.resTestDir, uuid(), {
    expression: opts.testQuery,
    fields: ['name', 'size', 'exists', 'type']
  }]).then(subscriptionSuccess.bind(null, opts.resTestDir));

  Promise.all([
    watchProj,
    watchTests,
    subProj,
    subTests
  ]).catch(handleError);

  client.on('subscription', function (resp) {

    if (opts.disableExecOnStart && resp.is_fresh_instance) {
      return;
    }

    let numChanged = resp.files.length;
    let list = resp.files.map(mapTestFiles(opts.testDir));
    // console.log(resp);
    console.log(`${numChanged} file(s) changed`);
    console.log(`relative test files ${list.map(listTestFiles)}`);

    list = _.filter(list, filterMissing);
    let exec = `${opts.command} ${list.join(' ')}`;

    if (!list.length) {
      console.log('no test files to execute');
      return;
    }


    console.log(`executing ${exec}`);
    let cp = childProcess.exec(exec);
    cp.stdout.pipe(process.stdout);
    cp.stderr.pipe(process.stderr);
  });
};


subscribeToProcessSignals(null, shutdown);