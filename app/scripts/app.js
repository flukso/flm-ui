'use strict';

angular.module('flmUiApp', ['ngCookies', 'ui.bootstrap'])
  .config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl'
      })
      .when('/sensor', {
        templateUrl: 'views/sensor.html',
        controller: 'SensorCtrl'
      })
      .when('/wifi', {
        templateUrl: 'views/wifi.html',
        controller: 'WifiCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
  });
