'use strict';

describe('Controller: AddCtrl', function() {

  // load the controller's module
  beforeEach(module('flmUiApp'));

  var AddCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function($controller) {
    scope = {};
    AddCtrl = $controller('AddCtrl', {
      $scope: scope
    });
  }));

  it('should attach a list of awesomeThings to the scope', function() {
    expect(scope.awesomeThings.length).toBe(3);
  });
});
