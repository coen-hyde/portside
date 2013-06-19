var util = require('util')
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
  if (typeof options === 'undefined') {
    var options = {};
  }

  _.defaults(options, {
    couchdb: "http://127.0.0.1:5984/portside"
  , env: process.env.NODE_ENV || 'development'
  , portRange: [3000, 4000]
  });

  this.options = options;

  // Initiate share config from a couchdb server. 
  this.config = sharedconfig(this.options.couchdb);

  this.config.on('error', function(){

  });

  _.defaults(this.config, { allocatedPorts: [], services: {}});
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
Portside.prototype.allocate = function() {
  for(var i = this.options.portRange[0]; i <= this.options.portRange[1]; i++) {
    if (this.config.allocatedPorts.indexOf(i) === -1) {
      var port = i;
      break;
    }
  }

  // All ports are full trigger event
  if (typeof port === 'undefined') {
    this.emit('full');
    return null;
  }

  this.config.allocatedPorts.push(port);
  return port;
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


module.exports = function(options, cb) {
  if (typeof options === 'function') {
    cb = options;
    options = {};
  }

  var porter = new Portside(options);

  porter.config.use(porter.options.env, function(err, data) {
    console.log(err);
    return cb(err, porter);
  });
}