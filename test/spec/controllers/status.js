'use strict';

describe('Controller: StatusCtrl', function() {

  // load the controller's module
  beforeEach(module('flmUiApp'));

  var StatusCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function($controller) {
    scope = {};
    StatusCtrl = $controller('StatusCtrl', {
      $scope: scope
    });
  }));

  it('should attach a list of awesomeThings to the scope', function() {
    expect(scope.awesomeThings.length).toBe(3);
  });
});
