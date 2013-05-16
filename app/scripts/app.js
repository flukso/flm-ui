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
      .when('/status', {
        templateUrl: 'views/status.html',
        controller: 'StatusCtrl'
      })
      .when('/services', {
        templateUrl: 'views/services.html',
        controller: 'ServicesCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
  });

angular.module('flmUiApp')
  .factory('flmRpc', function ($rootScope, $http, $location, $q) {
    return {
      call: function (endpoint, method, params) {
        var deferred = $q.defer();

        var url = "/cgi-bin/luci/rpc/" + endpoint  + "?auth=" + $rootScope.sysauth;
        var request = {
          "method": method,
          "params": params,
          "id": Date.now()
        };

        $http.post(url, request)
          .success(function(response) {
            if (response.error) {
              deferred.reject(response.error);
            } else {
              deferred.resolve(response.result);
            }
          })
          .error(function(response) {
            /* an invalid auth seems to trigger a 500 */
            $location.path("/");
          });

        return deferred.promise;
      }
    };
  });
