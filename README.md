# connstats: hits and DDP monitoring for Meteor apps

## Installing

From your Meteor app, run:

    $ meteor add pcarrier:connstats

## Interface

`connstats` exposes monitoring information about hits and DDP connections
as JSON over `/.well-known/pcarrier/connstats`.

Whenever an error occurs, it will set an appropriate status code and respond with a JSON object
whose only property is `"error"`.

For example, if a secret is set in the Meteor settings but was not passed in the query string as
`?secret=[...]`, it will respond with the status code 403 and the object:

    {"error":"secret needed"}

If no error occured, it returns a JSON document following this format:

    {
      "hitSamples": [
        {
          "ua": "curl/7.43.0",
          "ip": "192.0.2.1",
          "host": "example.com",
          "url": "/hello?world",
          "ts": "2016-01-01T00:00:00.000Z"
        },
        ...
      ],
      "activeSessions": [
        {
          "ua": "curl/7.43.0",
          "ip": "192.0.2.1",
          "started": "2016-01-01T00:00:00.000Z"
        },
        ...
      ],
      "startedSessions": [
        {
          "ua": "curl/7.43.0",
          "ip": "192.0.2.1",
          "started": "2016-01-01T00:00:00.000Z"
        },
        ...
      ],
      "endedSessions": [
        {
          "ua": "curl/7.43.0",
          "ip": "192.0.2.2",
          "started": "2016-01-01T00:00:01.000Z",
          "ended":   "2016-01-01T00:00:02.000Z"
        },
        ...
      ]
    }

This format is specified in [schema.json](https://github.com/pcarrier/meteor-connstats/blob/master/schema.json),
which follows the IETF draft [draft-zyp-json-schema-04](https://tools.ietf.org/html/draft-zyp-json-schema-04).

`hitSamples` tracks all HTTP and WebSocket requests.
It uses random replacement, so arbitrarily old hits can be found in the samples
but recent hits are more likely to be exposed than older hits.

## Settings

`Meteor.settings.connstats` can have the following keys:

### `trackHosts` (boolean)

Track the `Host:` header in hitSamples; disabled by default.

### `trackURLs` (boolean)

Track URLs in hitSamples; disabled by default.

### `hitSamples` (integer)

How many hit samples should be kept and exposed; 256 by default.

### `startedSessions` (integer)

How many of the last started sessions should be kept and exposed; 64 by default.

### `endedSessions` (integer)

How many of the last ended sessions should be kept and exposed; 64 by default.

### `logSessions` (boolean)

Log every session start and end; disabled by default.

### `secret` (string or undefined)

A secret that needs to be passed in the query string to access the resource;
by default the URI is publicly visible.

## Notes

- The `ip` field is determined by reading the first field of the comma-separated `X-Forwarded-For` header.
This will break if Meteor is not behind a proxy respecting
[the semantics of this non-standard but widely agreed-upon header](https://en.wikipedia.org/wiki/X-Forwarded-For).

- This package abuses the `/.well-known/` prefix from [RFC-5785](https://tools.ietf.org/html/rfc5785#section-3)
  as we have not gone through the registration process yet.
