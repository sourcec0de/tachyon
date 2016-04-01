'use strict';

let bb = require('bluebird');
let watchman = require('fb-watchman');
let client = new watchman.Client();
let childProcess = require('child_process');
bb.promisifyAll(client);

let watchDir = process.cwd();
let sub = {
  expression: [
    'allof',
      ['match', '*.js'],
      ['not',
        ['dirname', 'node_modules']
      ]
  ],
  // Which fields we're interested in
  fields: ['name', 'size', 'exists', 'type']
};

function handleError(error){
  console.error('Error initiating watch:', error);
  return;
}

// Initiate the watch
client
  .commandAsync(['watch-project', watchDir])
  .then(function(resp) {

    if ('warning' in resp) {
      console.log('warning: ', resp.warning);
    }

    console.log(`watch started on ${resp.watch} relative to ${resp.relative_path}`);

    return client.commandAsync(['subscribe', resp.watch, 'jsWatch', sub]);
  })
  .then(function(resp){
    console.log(resp);
    console.log(`subscription ${resp.subscribe} established`);
  })
  .catch(handleError);


client.on('subscription', function (resp) {
  let numChanged = resp.files.length;
  let list = resp.files.map(f=>f.name).join(' ');
  let command = `ls -lha ${list}`;
  console.log(`${numChanged} files changed`);
  console.log(`list ${list}`);
  console.log(`executing ${command}`);
  process.stdout.write(childProcess.execSync(command));
});