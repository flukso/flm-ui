'use strict';

angular.module('flmUiApp')
  .controller('MainCtrl', function ($rootScope, $scope, $http, $location) {
    $scope.user = "root";
    $scope.pass = "root";
    $scope.alerts = [];

    $scope.closeAlert = function(index) {
        $scope.alerts.splice(index, 1);
    };

    $scope.rpcLogin = function() {
        var url = "/cgi-bin/luci/rpc/auth";
        var request = {
            "method": "login",
            "params": [$scope.user, $scope.pass],
            "id": Date.now()
        };

        $http.post(url, request).success(function(response) {
            if (response.result) {
                $rootScope.sysauth = response.result;
                $location.path("/sensor");
            } else {
                $scope.alerts.push({
                    type: "error",
                    msg: "Wrong username or password. Please try again."
                });
            };
        });
    };

  });
