const URL = Npm.require('url'),
  defaultConfig = {
    hitSamples: 1024,
    openedSessions: 64,
    closedSessions: 64,
  },
  config = _.extend(defaultConfig, Meteor.settings.connstats),
  hitSamples = _.range(config.hitSamples).map(() => undefined),
  openedSessions = [],
  closedSessions = [],
  randBucket = () => _.random(config.hitSamples - 1),
  activeSessions = {},
  append = (dest, entry, limit) => {
    dest.push(entry);
    if (dest.length > limit) {
      dest.shift();
    }
  },
  connDescr = (conn) => ({
    ua: conn.httpHeaders['user-agent'],
    ip: conn.httpHeaders['x-forwarded-for'],
    started: new Date(),
  });

WebApp.connectHandlers.use((req, res, next) => {
  if (req.url.indexOf('/.well-known/pcarrier/connstats') === 0) {
    res.setHeader('Content-Type', 'application/json');

    if (typeof config.secret !== 'undefined') {
      const query = URL.parse(req.url, true).query;
      if (config.secret !== query.secret) {
        res.statusCode = 403;
        return res.end(JSON.stringify({error:"secret needed"}));
      }
    }

    res.end(JSON.stringify({
      hitSamples: _.without(hitSamples, undefined),
      activeSessions: _.values(activeSessions),
      openedSessions,
      closedSessions,
    }));
  } else {
    hitSamples[randBucket()] = {
      ua: req.headers['user-agent'],
      ip: req.headers['x-forwarded-for'],
    };
    next();
  }
});

Meteor.onConnection(function(conn) {
  const descr = connDescr(conn);
  activeSessions[conn.id] = descr;
  append(openedSessions, descr, config.openedSessions);
  conn.onClose(function() {
    delete activeSessions[conn.id];
    descr.stopped = new Date();
    append(closedSessions, descr, config.closedSessions);
  });
});
