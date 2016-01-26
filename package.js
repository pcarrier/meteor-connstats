Package.describe({
  name: 'pcarrier:connstats',
  summary: 'Meteor connection stats',
  version: '0.1.1',
});

Package.onUse(function (api) {
  api.versionsFrom("1.2");
  api.use([
  	'ecmascript',
  	'underscore',
  	'meteor',
  	'webapp',
  	'ddp-server'
  ], ['server']);
  api.addFiles('connstats.js', 'server');
});
