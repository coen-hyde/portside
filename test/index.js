var should = require('should')
  , portside = require('../index.js');

describe('Portside', function() {
  it('should allocate a new ports', function(done) {
    portside(function(allocator) {
      allocator.allocate().should.equal(3000);
      allocator.allocate().should.equal(3001);
      allocator.allocate().should.equal(3002);
      done();
    });
  });

  it('should release ports', function(done) {
    portside(function(allocator) {
      allocator.allocate().should.equal(3000);
      allocator.allocate().should.equal(3001);
      allocator.allocate().should.equal(3002);

      allocator.release(3001);
      allocator.allocate().should.equal(3001);
      done();
    });
  });
}); 