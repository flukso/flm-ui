'use strict';

describe('Controller: SensorCtrl', function() {

  // load the controller's module
  beforeEach(module('flmUiApp'));

  var SensorCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function($controller) {
    scope = {};
    SensorCtrl = $controller('SensorCtrl', {
      $scope: scope
    });
  }));

  it('should attach a list of awesomeThings to the scope', function() {
    expect(scope.awesomeThings.length).toBe(3);
  });
});
