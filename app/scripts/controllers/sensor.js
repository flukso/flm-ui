/**
 * Copyright (c) 2013 Bart Van Der Meerssche <bart@flukso.net>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

angular.module("flmUiApp")
    .controller("SensorCtrl", function($scope, $dialog, flmRpc) {
        $scope.debug = false;
        $scope.alerts = [];
        $scope.noOfSensors = 5;
        $scope.i = 1;

        $scope.closeAlert = function(index) {
            $scope.alerts.splice(index, 1);
        };

        function pushError(error) {
            $scope.alerts.push({
                type: "error",
                msg: error
            });
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
                '<div class="progress progress-striped {{progressStatus}} active">' +
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

        flmRpc.call("uci", "get_all", ["flukso"]).then(
            function(flukso) {
                $scope.sensors = {};
                $scope.sensors.main = flukso.main;
                $scope.sensors.daemon = flukso.daemon;

                for (var i=1; i<6; i++) {
                    $scope.sensors[i] = flukso[i.toString()];
                }
            },
            pushError
        );
    }
);

angular.module("flmUiApp")
    .controller("SensorSaveCtrl", ["$scope", "$q", "flmRpc", "dialog", "flukso",
    function($scope, $q, flmRpc, dialog, flukso) {
        $scope.flukso = flukso;
        $scope.closeDisabled = true;
        $scope.progress = 0;
        $scope.progressStatus = "progress-info";
        $scope.progressLog = "Saving sensor parameters: ";
        $scope.close = function(result) {
            dialog.close();
        }

        var promiseUci = [];

        for (var section in flukso) {
            var promise = flmRpc.call("uci", "tset", ["flukso", section, flukso[section]]).then(
                function(result) {
                    $scope.progress += 10;
                    $scope.progressLog += ".";
                },
                function(error) {
                    $scope.progressLog += "\n" + error;
                }
            );

            promiseUci.push(promise);
        }

        $q.all(promiseUci)
        .always(function() {
            flmRpc.call("uci", "commit", ["flukso"])
            .then(
                function(result) {
                    $scope.progress += 10;
                    $scope.progressLog += "\nCommitting changes: " + result;
                },
                function(error) {
                    $scope.progressLog += "\nCommitting changes: " + error;
                })
            .always(function() {
                flmRpc.call("sys", "exec", ["fsync"])
                .then(
                    function(result) {
                        $scope.progress += 15;
                        $scope.progressLog += "\nSyncing configuration: " + result;
                    },
                    function(error) {
                        $scope.progressLog += "\nSyncing configuration: " + error;
                    })
                .always(function() {
                    flmRpc.call("sys", "exec", ["/etc/init.d/flukso restart"])
                    .then(
                        function(result) {
                            $scope.progress += 15;
                            $scope.progressLog += "\nRestarting the Flukso daemon: ok";
                        },
                        function(error) {
                            $scope.progressLog += "\nRestarting the Flukso daemon: " + error;
                        })
                    .always(function() {
                        $scope.closeDisabled = false;
                        if ($scope.progress == 100) {
                            $scope.progressStatus = "progress-success";
                        } else {
                            $scope.progressStatus = "progress-danger";
                        };
                    })
                })
            })
        });
    }]);
