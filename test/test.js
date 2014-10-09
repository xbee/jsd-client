
var assert = require("assert");
var should = require('should');
var expect = require('expect.js');
var jiasudu = require('../build/main.js');

var Clza = (function() {
  var priva = 'world';

  function xtest() {
    return priva;
  }

  function double(self) {
    return self.fa * 2;
  }

  function Clza(v, s) {
    this.fa = v;
    this.fb = s;
  };

  Clza.prototype.getFa = function() {
    return this.fa;
  }

  Clza.prototype.getFb = function() {
    return xtest();
  }

  Clza.prototype.doubleFa = function() {
    var self = this;
    return double(self);
  }

  return Clza;
})();

describe('Array', function(){
    describe('#indexOf()', function(){
        it('should return -1 when the value is not present', function(){
            assert.equal(-1, [1,2,3].indexOf(5));
            assert.equal(-1, [1,2,3].indexOf(0));
        });

    })
});

var user = {
    name: 'tj'
    , pets: ['tobi', 'loki', 'jane', 'bandit']
};

user.should.have.property('name', 'tj');
user.should.have.property('pets').with.lengthOf(4);

// if the object was created with Object.create(null)
// then it doesn't inherit `Object` and have the `should` getter
// so you can do:
should(user).have.property('name', 'tj');
should(true).ok;

//someAsyncTask(foo, function(err, result){
//    should.not.exist(err);
//    should.exist(result);
//    result.bar.should.equal(foo);
//});

expect(1).to.be.ok();
expect(true).to.be.ok();
expect({}).to.be.ok();
expect(0).to.not.be.ok();

describe('Jasmine Test suite', function() {
    it('should increment a variable', function() {
        var foo = 0;
        foo++;
        expect(foo).to.be.equal(1);
    });
    it('should exists a ip', function(){
        var ips = ['192.168.1.103', '10.0.0.2'];
        ips.indexOf('192.168.2.1').should.lessThan(0);
        ips.indexOf('192.168.1.103').should.equal(0);
    });
    it('should be get local ips', function() {
        var signal = new jiasudu.SignalSession();
        var ips = signal.localIPs;
        ips.indexOf('192.168.2.1').should.lessThan(0);
        ips.indexOf('192.168.1.103').should.greaterThan(-1);
    });
});