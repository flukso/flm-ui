/**
 * Copyright (c) 2016 Bart Van Der Meerssche <bart@flukso.net>
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
    .controller("PortCtrl", function($rootScope, $scope, $modal, flmRpc) {
        $scope.debug = false;
        $scope.alerts = [];
        $scope.ports = null;
        $scope.noOfPorts = 7;
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
            if (!$scope.ports)
                return true;

            var port = $scope.ports[$scope.i];
            var disable = port.enable == "0";

            switch (param) {
            case "phase":
            case "led":
            case "enable":
                disable = false;
                break;
            case "current":
                disable = disable || port["class"] != "current clamp";
                break;
            case "type":
            case "constant":
                disable = disable || port["class"] != "pulse";
                break;
            }

            return disable;
        }

        $scope.show = function(param) {
            var clss = $scope.ports ? $scope.ports[$scope.i].class : "current clamp";

            switch (param) {
            case "current":
                return clss == "current clamp";
                break;
            case "type":
            case "constant":
                return clss == "pulse";
                break;
            case "dsmr":
                return clss == "uart";
                break;
            }
        }

        function regexCreate(param) {
            var regex = {
                "name": /^\w[\w\ \-]{0,15}$/,
                "constant": /^\d+(\.\d{0,3})?$/,
            };

            return {
                test: function(value) {
                    if ($scope.disable(param)) {
                        return true;
                    }

                    return regex[param].test(value);
                }
            };
        }

        $scope.patternName = (function() {
            return regexCreate("name");
        })();

        $scope.patternConstant = (function() {
            return regexCreate("constant");
        })();

        $scope.sensors = function() {
            var tpl =
                '<div class="modal-header">'+
                '<h4>Port {{port}} sensors</h4>'+
                '</div>'+
                '<div class="modal-body">'+
                '<div class="grid" id="sensors" ui-grid="sensors"></div>' +
                '</div>'+
                '<div class="modal-footer">'+
                '<button ng-click="close()" class="btn btn-primary">Close</button>'+
                '</div>';

            var rslv = {
                port: function() {
                    return $scope.i;
                },
                sensors: function() {
                    var sensors = {};

                    return sensors;
                }
            };

            var opts = {
                backdrop: true,
                keyboard: false,
                backdropClick: false,
                template: tpl,
                resolve: rslv,
                controller: "PortSensorCtrl"
            };

            $modal.open(opts).result
                .then(function() {
                });
        };

        $scope.save = function() {
            var tpl =
                '<div class="modal-header">'+
                '<h2>Updating port configuration</h2>'+
                '</div>'+
                '<div class="modal-body">'+
                '<div class="progress progress-striped {{progressStatus}} active">' +
                '<div class="bar" style="width: {{progress}}%;"></div>' +
                '</div>' +
                '<textarea id="progressLog" readonly="readonly">{{progressLog}}</textarea>'+
                /*'<p>{{flx}}</p>' +*/
                /*'<p>{{flukso}}</p>' +*/
                '</div>'+
                '<div class="modal-footer">'+
                '<button ng-click="close()" class="btn btn-primary" ng-disabled="closeDisabled">Close</button>'+
                '</div>';

            var rslv = {
                flx: function() {
                    var flx = {};

                    flx.main = {};
                    switch ($scope.ports.main.phase) {
                    case "1phase":
                        flx.main.phase = "1p";
                        break;
                    case "3phase with N":
                        flx.main.phase = "3p+n";
                        break;
                    case "3phase without N":
                        flx.main.phase = "3p-n";
                        break;
                    }
                    switch ($scope.ports.main.led_mode) {
                    case "port 4":
                        flx.main.led_mode = "4";
                        break;
                    case "port 5":
                        flx.main.led_mode = "5";
                        break;
                    case "port 6":
                        flx.main.led_mode = "6";
                        break;
                    case "heartbeat":
                        flx.main.led_mode = "255";
                        break;
                    }
                    for (var i = 1; i <= $scope.noOfPorts; i++) {
                        flx[i.toString()] = {
                            enable: $scope.ports[i].enable,
                            name: $scope.ports[i].name,
                            current: $scope.ports[i].current,
                            constant: $scope.ports[i].constant,
                            dsmr: $scope.ports[i].dsmr
                        }
                    }
                    return flx;
                },
                flukso: function() {
                    var flukso = {};

                    for (var i = 1; i <= 36; i++) {
                        flukso[i.toString()] = {
                            enable: $scope.ports[Math.floor((i - 1) / 12) + 1].enable
                        }
                    }
                    for (var i = 4; i < 7; i++) { /* only apply to pulse ports */
                        var offset = 33;
                        var j = offset + i;
                        flukso[j.toString()] = {
                            enable: $scope.ports[i].enable,
                            type: $scope.ports[i].type
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
                controller: "PortSaveCtrl"

            };

            $modal.open(opts).result
                .then(function() {
                });
        };

        flmRpc.call("uci", "get_all", ["flx"]).then(
            function(flx) {
                $scope.ports = {};
                $scope.ports.main = flx.main;
                switch (flx.main.led_mode) {
                case "4":
                    $scope.ports.main.led_mode = "port 4";
                    break;
                case "5":
                    $scope.ports.main.led_mode = "port 5";
                    break;
                case "6":
                    $scope.ports.main.led_mode = "port 6";
                    break;
                case "255":
                    $scope.ports.main.led_mode = "heartbeat";
                    break;
                }
                switch (flx.main.phase) {
                case "1p":
                    $scope.ports.main.phase = "1phase";
                    break;
                case "3p+n":
                    $scope.ports.main.phase = "3phase with N";
                    break;
                case "3p-n":
                    $scope.ports.main.phase = "3phase without N";
                    break;
                }

                for (var i = 1; i <= $scope.noOfPorts; i++) {
                    $scope.ports[i] = flx[i.toString()];
                    if ($scope.ports[i].class == "ct") {
                        $scope.ports[i].class = "current clamp"
                    }
                }
            },
            pushError
        );

        flmRpc.call("uci", "get_all", ["flukso"]).then(
            function(flukso) {
                for (var i = 4; i < 7; i++) { /* only apply to pulse ports */
                    var offset = 33;
                    var j = offset + i;
                    $scope.ports[i].type = flukso[j.toString()].type;
                }
            },
            pushError
        );
    }
);

angular.module("flmUiApp")
    .controller("PortSaveCtrl", ["$scope", "$q", "flmRpc", "$modalInstance", "flx", "flukso",
    function($scope, $q, flmRpc, $modalInstance, flx, flukso) {
        $scope.flx = flx;
        $scope.flukso = flukso;
        $scope.closeDisabled = true;
        $scope.progress = 0;
        $scope.progressStatus = "progress-info";
        $scope.progressLog = "Saving port and sensor parameters:\n";
        $scope.close = function(result) {
            $modalInstance.close();
        }

        var promiseUci = [];
        for (var section in flx) {
            var promise = flmRpc.call("uci", "tset", ["flx", section, flx[section]]).then(
                function(result) {
                    $scope.progress += 2;
                    $scope.progressLog += ".";
                },
                function(error) {
                    $scope.progressLog += "\n" + error;
                }
            );

            promiseUci.push(promise);
        }
        for (var section in flukso) {
            var promise = flmRpc.call("uci", "tset", ["flukso", section, flukso[section]]).then(
                function(result) {
                    $scope.progress += 2;
                    $scope.progressLog += ".";
                },
                function(error) {
                    $scope.progressLog += "\n" + error;
                }
            );

            promiseUci.push(promise);
        }

        $q.all(promiseUci)
        .finally(function() {
            flmRpc.call("uci", "commit", ["flx"]);
            flmRpc.call("uci", "commit", ["flukso"]);
            flmRpc.call("sys", "exec", ["ubus send flukso.sighup"]);
            $scope.progressLog += "\nCommitting changes.";
            flmRpc.call("sys", "exec", ["ubus send flx.shift.calc"]);
            $scope.progressLog += "\nCalculating shift parameters.";
            $scope.progressLog += "\n\t* Make sure PV production is turned off."
            $scope.progressLog += "\n\t* Make sure there's a decent load present on each phase."
            $scope.progress += 6;
            if ($scope.progress == 100) {
                $scope.progressStatus = "progress-success";
            } else {
                $scope.progressStatus = "progress-danger";
            };
            $scope.closeDisabled = false;
        })
    }]);
