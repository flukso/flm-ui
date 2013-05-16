'use strict';

describe('Controller: SyslogCtrl', function() {

  // load the controller's module
  beforeEach(module('flmUiApp'));

  var SyslogCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function($controller) {
    scope = {};
    SyslogCtrl = $controller('SyslogCtrl', {
      $scope: scope
    });
  }));

  it('should attach a list of awesomeThings to the scope', function() {
    expect(scope.awesomeThings.length).toBe(3);
  });
});
