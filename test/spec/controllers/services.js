'use strict';

describe('Controller: ServicesCtrl', function() {

  // load the controller's module
  beforeEach(module('flmUiApp'));

  var ServicesCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function($controller) {
    scope = {};
    ServicesCtrl = $controller('ServicesCtrl', {
      $scope: scope
    });
  }));

  it('should attach a list of awesomeThings to the scope', function() {
    expect(scope.awesomeThings.length).toBe(3);
  });
});
