'use strict';

angular.module('flmUiApp', ['ngCookies', 'ui.bootstrap'])
  .config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl',
        tagName: null
      })
      .when('/sensor', {
        templateUrl: 'views/sensor.html',
        controller: 'SensorCtrl',
        tagName: 'sensor'
      })
      .when('/wifi', {
        templateUrl: 'views/wifi.html',
        controller: 'WifiCtrl',
        tagName: 'wifi'
      })
      .when('/status', {
        templateUrl: 'views/status.html',
        controller: 'StatusCtrl',
        tagName: 'status'
      })
      .when('/services', {
        templateUrl: 'views/services.html',
        controller: 'ServicesCtrl',
        tagName: 'services'
      })
      .when('/syslog', {
        templateUrl: 'views/syslog.html',
        controller: 'SyslogCtrl',
        tagName: 'syslog'
      })
      .otherwise({
        redirectTo: '/'
      });
  })
  .run(function($rootScope, $route) {
    $rootScope.$on("$routeChangeSuccess", function(ngEvent, currRoute, prevRoute) {
      if (prevRoute && prevRoute.tagName) {
        angular.element(document).find(prevRoute.tagName)
          .parent().parent().removeClass("active");
      }

      if (currRoute && currRoute.tagName) {
        angular.element(document).find(currRoute.tagName)
          .parent().parent().addClass("active");
      }
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
