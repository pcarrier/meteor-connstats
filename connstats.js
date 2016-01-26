class RingArray {
  constructor(capacity) {
    this.capacity = capacity;
    this._entries = [];
    this._position = 0;
    this.available = 0;
    for (let i = 0; i < capacity; i++) {
      this._entries[i] = undefined;
    }
  }

  push(entry) {
    this._entries[this._position] = entry;
    this._position = (this._position + 1) % this.capacity;
    if (this.available < this.capacity) {
      this.available += 1;
    }
    return entry;
  }

  entries(n) {
    if (typeof n === 'undefined' || n >= this.available) {
      n = this.available;
    }
    const result = [];
    let pos = (this._position + this.capacity - n) % this.capacity;
    for (let i = 0; i < n; i++) {
      result[i] = this._entries[pos];
      pos = (pos + 1) % this.capacity;
    }
    return result;
  }
}

const URL = Npm.require('url'),
  defaultConfig = {
    trackHosts:      false,
    trackURLs:       false,
    hitSamples:      256,
    startedSessions: 64,
    endedSessions:   64,
    secret:          undefined,
  },
  config = _.extend({}, defaultConfig, Meteor.settings.connstats),
  hitSamples = _.range(config.hitSamples).map(() => undefined),
  startedSessions = new RingArray(config.startedSessions),
  endedSessions = new RingArray(config.startedSessions),
  randBucket = () => _.random(config.hitSamples - 1),
  activeSessions = {},
  connDescr = (conn) => ({
    ua: conn.httpHeaders['user-agent'],
    ip: conn.httpHeaders['x-forwarded-for'].split(',')[0],
    started: new Date(),
  });

WebApp.connectHandlers.use((req, res, next) => {
  const hit = {
    ua: req.headers['user-agent'],
    ip: req.headers['x-forwarded-for'].split(',')[0],
    ts: new Date(),
  };
  if (config.trackURLs) {
    hit.url = req.url;
  }
  if (config.trackHosts) {
    hit.host = req.headers['host'];
  }
  hitSamples[randBucket()] = hit;

  if (req.url.indexOf('/.well-known/pcarrier/connstats') !== 0) {
    return next();
  }

  res.setHeader('Content-Type', 'application/json');

  if (typeof config.secret !== 'undefined') {
    const query = URL.parse(req.url, true).query;
    if (config.secret !== query.secret) {
      res.statusCode = 403;
      return res.end(JSON.stringify({error:"secret needed"}));
    }
  }

  res.end(JSON.stringify({
    hitSamples: _.compact(hitSamples),
    activeSessions: _.values(activeSessions),
    startedSessions: startedSessions.entries(),
    endedSessions: endedSessions.entries(),
  }));
});

Meteor.onConnection(function(conn) {
  const descr = connDescr(conn);
  activeSessions[conn.id] = descr;
  startedSessions.push(descr);
  conn.onClose(function() {
    delete activeSessions[conn.id];
    descr.ended = new Date();
    endedSessions.push(descr);
  });
});
