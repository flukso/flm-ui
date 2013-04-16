"use strict";

angular.module("flmUiApp")
    .controller("SensorCtrl", function($scope, $http, $cookies, $location) {
        $scope.debug = true;
        $scope.alerts = [];
        $scope.noOfSensors = 5;
        $scope.i = 1;

        $scope.closeAlert = function(index) {
            $scope.alerts.splice(index, 1);
        };

        $scope.disable = function(param) {
            /* prevent js errors when waiting for rpc call to return */
            if (!$scope.sensors)
                return true;

            var sensor = $scope.sensors[$scope.i];
            var disable = sensor.enable == "0";

            switch (param) {
                case "max_analog_sensors":
                    disable = $scope.sensors.main.hw_minor == "1";
                    break;
                case "phase":
                    disable = $scope.sensors.main.max_analog_sensors == "1";
                    break;
                 case "enable":
                    disable = sensor.port.length == 0;
                    break;
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

        $scope.maxAnaSensorsChange = function() {
            $scope.sensors[2].enable = "0";
            $scope.sensors[3].enable = "0";

            if ($scope.sensors.main.max_analog_sensors == "1") {
                $scope.sensors[2]["class"] = "pulse";
                $scope.sensors[3]["class"] = "pulse";

                /* if max_analog_sensors == 1 then phase should be forced to 1 */
                if ($scope.sensors.main.phase == "3") {
                    $scope.sensors.main.phase = "1";

                    for (var i=1; i<4; i++) {
                        $scope.sensors[i].port = [i.toString()];
                    }
                }
            } else {
                $scope.sensors[2]["class"] = "analog";
                $scope.sensors[3]["class"] = "analog";
            }
        };

        $scope.phaseChange = function() {
            if ($scope.sensors.main.phase == "1") {
                for (var i=1; i<4; i++) {
                    $scope.sensors[i].port = [i.toString()];
                }
            } else {
                $scope.sensors[1].port = ["1", "2", "3"];
                $scope.sensors[2].port = [];
                $scope.sensors[3].port = [];

                $scope.sensors[2].enable = "0";
                $scope.sensors[3].enable = "0";
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
                if (!response.result) {
                    $scope.alerts.push({
                        type: "error",
                        msg: response.error
                    });
                    return;
                };

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
