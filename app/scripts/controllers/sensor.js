"use strict";

angular.module("flmUiApp")
    .controller("SensorCtrl", function($scope, $dialog, $http, $location) {
        $scope.debug = false;
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
                return /.*/;
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

                $scope.sensors[2]["type"] = "electricity";
                $scope.sensors[3]["type"] = "electricity";
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
            var tpl =
                '<div class="modal-header">'+
                '<h2>Updating sensor configuration</h2>'+
                '</div>'+
                '<div class="modal-body">'+
                '<div class="progress progress-striped active">' +
                '<div class="bar" style="width: {{progress}}%;"></div>' +
                '</div>' +
                '<textarea id="progressLog" readonly="readonly">{{progressLog}}</textarea>'+
                /*'<p>{{flukso}}</p>' +*/
                '</div>'+
                '<div class="modal-footer">'+
                '<button ng-click="close()" class="btn btn-primary" ng-disabled="closeDisabled">Close</button>'+
                '</div>';

            var rslv = {
                flukso: function() {
                    var flukso = {};

                    flukso.main = {
                        max_analog_sensors: $scope.sensors.main.max_analog_sensors,
                        phase: $scope.sensors.main.phase

                    };

                    for (var i=1; i<6; i++) {
                        flukso[i.toString()] = {
                            enable: $scope.sensors[i].enable,
                            type: $scope.sensors[i].type,
                            "class": $scope.sensors[i]["class"],
                            port: $scope.sensors[i].port,
                            "function": $scope.sensors[i]["function"]
                        }

                        if ($scope.sensors[i].enable == "1") {
                            flukso[i.toString()]["function"] = $scope.sensors[i]["function"];

                            switch ($scope.sensors[i]["class"]) {
                                case "analog":
                                    flukso[i.toString()].voltage = $scope.sensors[i].voltage;
                                    flukso[i.toString()].current = $scope.sensors[i].current;
                                    break;
                                case "pulse":
                                    flukso[i.toString()].constant = $scope.sensors[i].constant;
                                    break;
                            }
                        }
                    }

                    return flukso;
                }
            };

            var opts = {
                backdrop: true,
                keyboard: false,
                backdropClick: false,
                template: tpl,
                resolve: rslv,
                controller: "SensorSaveCtrl"

            };

            $dialog.dialog(opts).open()
                .then(function() {
                });
        };

        /* cookie-based auth seems broken, revert to adding a query param */
        var url = "/cgi-bin/luci/rpc/uci?auth=" + $scope.sysauth;
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

angular.module("flmUiApp")
    .controller("SensorSaveCtrl", ["$scope", "$location", "$http", "dialog", "flukso",
    function($scope, $location, $http, dialog, flukso) {

        $scope.flukso = flukso;
        $scope.closeDisabled = true;
        $scope.progress = 0;
        $scope.progressLog = "Saving sensor parameters: ";
        $scope.close = function(result) {
            dialog.close();
        }

        var url = "/cgi-bin/luci/rpc/uci?auth=" + $scope.sysauth;
 
        for (var section in flukso) {
            var request = {
                "method": "tset",
                "params": ["flukso", section, flukso[section]],
                "id": Date.now()
            };

            $http.post(url, request)
                .success(function(response) {
                    if (response.result) {
                        $scope.progress += 10;
                        $scope.progressLog += ".";
                    } else {
                        $scope.progressLog += "\n" + response.error;
                    };
                }) 
                .error(function(response) {
                    $location.path("/");
                });
        }

        url = "/cgi-bin/luci/rpc/uci?auth=" + $scope.sysauth;
        request = {
            "method": "commit",
            "params": ["flukso"],
            "id": Date.now()
        };

        $http.post(url, request)
            .success(function(response) {
                $scope.progress += 10;
                $scope.progressLog += "\nCommitting changes: ";
                $scope.progressLog += (response.result || response.error);
            });


        url = "/cgi-bin/luci/rpc/sys?auth=" + $scope.sysauth;
        request = {
            "method": "exec",
            "params": ["fsync"],
            "id": Date.now()
        };

        $http.post(url, request)
            .success(function(response) {
                $scope.progress += 15;
                $scope.progressLog += "\nSyncing configuration:";
                $scope.progressLog += "\n" + (response.result || response.error);
            });

        url = "/cgi-bin/luci/rpc/sys?auth=" + $scope.sysauth;
        request = {
            "method": "exec",
            "params": ["/etc/init.d/flukso restart"],
            "id": Date.now()
        };

        $http.post(url, request)
            .success(function(response) {
                $scope.progress += 15;
                $scope.progressLog += "\nRestarting the Flukso daemon";
                $scope.closeDisabled = false;
            });
    }]);
