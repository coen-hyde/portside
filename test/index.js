var should = require('should')
  , net = require('net')
  , async = require('async')
  , portside = require('../index.js')
  , allocator;

describe('Portside', function() {
  beforeEach(function(done) {
    portside(function(err, ps) {
      should.not.exist(err);
      allocator = ps;
      done();
    });
  });

  it('should return true when port is available', function(done) {
    allocator.checkPort(3500, function(err, result) {
      should.not.exist(err);
      result.should.equal(true);
      done();
    });
  });

  it('should return false when port is not available', function(done) {
    var server = new net.Server();

    async.series([
      function(next) {

        server.listen(3500, next);
      },
      function(next) {
        allocator.checkPort(3500, function(err, result) {
          should.not.exist(err);
          result.should.equal(false);
          allocator.config.allocatedPorts.should.eql([3500]);
          next();
        });
      },
      function(next) {
        server.close(next);
      }
    ], done);
  });

  it('should find the next available port', function(done) {
    allocator.findAvailablePort(function(err, port) {
      should.not.exist(err);
      port.should.equal(3000);
      done();
    });
  });

  it('should be able to allocate a port', function(done) {
    async.forEachSeries([3000, 3001, 3002, 3003, 3004, 3005, 3006], function(portShould, done) {
      allocator.allocate(function(err, port) {
        should.not.exist(err);
        port.should.equal(portShould);
        done();
      });
    }, done)
  });
}); 