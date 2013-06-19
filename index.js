var util = require('util')
  , net = require('net')
  , url = require('url')
  , async = require('async')
  , nano = require('nano')
  , EventEmitter = require('events').EventEmitter;

var  sharedconfig = require('sharedconfig')
  , _  = require('lodash');


/**
 * ## Portside (options)
 *
 * A port allocator. Syncs changes from multiple 
 * instances of Portside via couchdb.
 *
 * Events
 *
 * - `claim (name, port)` upon the claim of a port
 * - `release (name, port)` upon the release of a port
 * - `full ()` upon all in bounds being claimed
 *
 * Options
 *
 * - `couchdb` couchdb url
 * - `portRange` 
 * 
 * @param {Object} an options hash
 * @api public
 */

var Portside = function(options) {
  var self = this;

  if (typeof options === 'undefined') {
    var options = {};
  }

  _.defaults(options, {
    couchdb: "http://127.0.0.1:5984/portside"
  , env: process.env.NODE_ENV || 'development'
  , portRange: [3000, 4000]
  });

  this.options = options;

  var createDb = function(cb) {
    // initialise the nano connection
    var dbUrl = url.parse(self.options.couchdb)
      , dbName = dbUrl.pathname.substr(1)
      , dbHost = self.options.couchdb.substring(0, self.options.couchdb.length-dbUrl.pathname.length);

    var srv = nano(dbHost);
    var db = srv.use(dbName);

    return srv.db.create(self.config._db.config.db, cb);
  };

  (function initConfig() {
    // Initiate share config from a couchdb server. 
    self.config = sharedconfig(self.options.couchdb);

    self.config.on('error', function(err) {
      // Try to create database if one does not exist
      if (err && err.message === 'no_db_file') {
        createDb(function(err) {
          if (err) {
            return self.emit('error', err);
          }

          // Database created now try again
          initConfig();
        });
      }
    });

    self.config.on('connect', function() {
      // Set some defaults
      _.defaults(self.config, { allocatedPorts: [], services: {}});

      self.emit('connect');
    });

  })();
}

/*!
 * Inherits from EventEmitter
 */

util.inherits(Portside, EventEmitter);

/*!
 * Allocate a new port
 *
 * @returns {Number}
 */
Portside.prototype.allocate = function(cb) {
  var self = this;

  this.findAvailablePort(function(err, port) {
    if (err) {
      return cb(err);
    }

    self.config.allocatedPorts.push(port);
    cb(null, port);
  });
}

/*!
 * Allocate a new port
 *
 * @returns {Number}
 */
Portside.prototype.release = function(port) {
  var pos = this.config.allocatedPorts.indexOf(port);
  delete this.config.allocatedPorts[pos];
}

/*!
 * Associate a service with a port
 */
Portside.prototype.associate = function(serviceName, port) {
  this.config.services[serviceName] = port;
}

/**
 * # findAvailablePort
 *
 * Will find an available port within the designated port range
 *
 * @param {Function} callback
 */
Portside.prototype.findAvailablePort = function(cb) {
  var port = this.options.portRange[0]
    , found = false
    , full = false
    , self = this;

  // Loop over ports until we find one available
  async.doUntil(function(done) {
    // Only check ports in our designated port range
    if (port >= self.options.portRange[1]) {
      full = true;
      this.emit('full');
      return;
    }

    // Check to see if this port is available
    self.checkPort(port, function(err, available) {
      if (true === available) {
        found = true;
      }
      else {
        // port was taken, go to next port
        port++;
      }
      done(err);
    })
  }, function() {
    return found || full;
  }, function(err) {
    if (err) {
      return cb(err);
    }

    cb(null, port);
  });

};

/**
 * # checkPort
 *
 * Will attempt to connect to a given port. If success,
 * will disconnect and pass that number to a callback.
 *
 * @param {Object} range min/max
 * @param {Function} callback
 */

Portside.prototype.checkPort = function(port, cb) {
  var self = this;

  // if already claimed, skip
  if (~this.config.allocatedPorts.indexOf(port)) {
    return cb();
  }

  var server = new net.Server();

  // if error, we don't want this server
  server.on('error', function (err) {
    self.config.allocatedPorts.push(port);
    return cb(null, false);
  });

  // if listening, we want to disconnect and pass back port
  server.listen(port, function () {
    server.on('close', function () {
      cb(null, true);
    });
    server.close();
  });
}


module.exports = function(options, cb) {
  if (typeof options === 'function') {
    cb = options;
    options = {};
  }

  var porter = new Portside(options);

  porter.on('error', function(err) {
    cb(err);
  });

  porter.on('connect', function() {
    cb(null, porter);
  });


}