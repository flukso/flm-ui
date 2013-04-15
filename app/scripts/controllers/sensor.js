"use strict";

angular.module("flmUiApp")
    .controller("SensorCtrl", function($scope, $http, $cookies, $location) {
        $scope.noOfSensors = 5;
        $scope.i = 1;

        $scope.disable = function(param) {
            /* prevent js errors when waiting for rpc call to return */
            if (!$scope.sensors)
                return true;

            var sensor = $scope.sensors[$scope.i];
            var disable = sensor.enable == "0";

            switch (param) {
                case "voltage":
                case "current":
                    disable = disable || sensor["class"] != "analog";
                    break;
                case "type":
                case "constant":
                    disable = disable || sensor["class"] != "pulse";
                    break;
            }

            return disable;
        }

        $scope.pattern = function(param) {
            var disabled = $scope.disable(param);

            /* bypass regex validation by allowing any pattern */
            if (disabled) {
                return /[\w\W]*/;
            }

            switch (param) {
                case "name":
                    return /^\w[\w\ \-]{0,15}$/;
                case "voltage":
                    return /^\d{1,3}$/;
                case "constant":
                    return /^\d+(\.\d{0,3})?$/;
            }
        };

        $scope.save = function() {
            for (var i=1; i<6; i++) {
                
            }
        };

        /* cookie-based auth seems broken, revert to adding a query param */
        var url = "/cgi-bin/luci/rpc/uci?auth=" + $cookies.sysauth;
        var request = {
            "method": "get_all",
            "params": ["flukso"],
            "id": Date.now()
        };

        $http.post(url, request)
            .success(function(response) {
                $scope.sensors = new Object();
                $scope.sensors.main = response.result.main;
                $scope.sensors.daemon = response.result.daemon;

                for (var i=1; i<6; i++) {
                    $scope.sensors[i] = response.result[i.toString()];
                }
            })
            .error(function(response) {
                /* an invalid auth seems to trigger a 500 */
                $location.path("/");
            });
    }
);
