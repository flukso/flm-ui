/**
 * Copyright (c) 2015 Bart Van Der Meerssche <bart@flukso.net>
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
    .controller("KubeCtrl", ["$scope", "$modal", "flmRpc",
    function($scope, $modal, flmRpc) {
        $scope.debug = false;
        $scope.alerts = [];

        $scope.closeAlert = function(index) {
            $scope.alerts.splice(index, 1);
        };

        function pushError(error) {
            $scope.alerts.push({
               type: "error",
                msg: error
            });
            $scope.$apply();
        };

        $scope.kube = {
            columnDefs: [
                { name: "kube_id", width: 100, enableCellEdit: false, pinnedLeft: true },
                { name: "name", width: 200, cellTooltip: "double-click to edit" },
                { name: "type", width: 100, enableCellEdit: false },
                { name: "software_version", width: 175, enableCellEdit: false },
                { name: "hardware_id", width: 300, enableCellEdit: false }
            ],
            onRegisterApi: function(gridApi) {
                $scope.gridApi = gridApi;
                gridApi.rowEdit.on.saveRow($scope, function(rowEntity) {
                    var section = rowEntity.kube_id;
                    var name = rowEntity.name;
                    $scope.gridApi.rowEdit.setSavePromise(rowEntity,
                        flmRpc.call("uci", "tset", ["kube", section, { name: name }])
                        .then(flmRpc.call("uci", "commit", ["kube"]))
                        .then(flmRpc.call("sys", "exec", ["ubus send flukso.sighup"]))
                    );
                });
            }
        };

        $scope.pair = function() {
            flmRpc.call("sys", "exec", ["ubus send flukso.kube.pair"])
            .then(function() {
                var tpl =
                    '<div class="modal-header">'+
                    '<h4>Listening for Kube pair requests...</h4>'+
                    '</div>'+
                    '<div class="modal-body">'+
                    '<div class="progress progress-striped {{progressStatus}} active">' +
                    '<div class="bar" style="width: {{progress}}%;"></div>' +
                    '</div>' +
                    '</div>'+
                    '<div class="modal-footer">'+
                    '<button ng-click="close()" class="btn btn-primary" ng-disabled="closeDisabled">Close</button>'+
                    '</div>';

                var opts = {
                    backdrop: true,
                    keyboard: false,
                    backdropClick: false,
                    template: tpl,
                    controller: "KubePairCtrl"

                };

                $modal.open(opts).result
                    .then(function() {
                    });

            }, pushError);
        };

        var client;
        var connectTimeout = 3; /* secs */
        var reconnectTimeout = 5e3; /* msecs */
        var broker = location.hostname;
        var port = 8083;
        var path = "/mqtt";

        function mqttConnect() {
            var wsID = "flm-ui-mqtt-" + Date.now();
            client = new Paho.MQTT.Client(broker, port, path, wsID);
            var options = {
                timeout: connectTimeout,
                onSuccess: onConnect,
                onFailure: function(msg) {
                    pushError(msg.errorMessage);
                    setTimeout(mqttConnect, reconnectTimeout);
                }
            };
            client.onConnectionLost = onConnectionLost;
            client.onMessageArrived = onMessageArrived;
            client.connect(options);
        }
        function onConnect() {
            client.subscribe("/device/+/config/kube");
        }
        function onConnectionLost(msg) {
            if (msg.errorCode !== 0) pushError(msg.errorMessage);
            setTimeout(mqttConnect, reconnectTimeout);
        }
        function onMessageArrived(msg) {
            var kubeTypes = {
                19217: "FLK01A",
                19218: "FLK01B"
            };

            var kube = JSON.parse(msg.payloadString);
            $scope.kube.data = [];
            for (var kid in kube) {
                if (parseInt(kid)) { /* making sure we've got a kube entry */
                    $scope.kube.data.push({
                        kube_id: kid,
                        name: kube[kid].name,
                        type: kubeTypes[kube[kid].hw_type],
                        software_version: kube[kid].sw_version,
                        hardware_id: kube[kid].hw_id
                    });
                }
            }
            $scope.$apply();
        }

        mqttConnect();
}]);

angular.module("flmUiApp")
    .controller("KubePairCtrl", ["$scope", "$q", "$modalInstance",
    function($scope, $q, $modalInstance) {
        $scope.closeDisabled = true;
        $scope.progress = 0;
        $scope.progressStatus = "progress-info";
        $scope.close = function(result) {
            $modalInstance.close();
        }

        var paired = false;
        var pairWindow = 20000; /* msecs */
        var updateInterval = 1000;
        var progressDelta = 100 * updateInterval / pairWindow;

        var client;
        var connectTimeout = 3; /* secs */
        var reconnectTimeout = 5e3; /* msecs */
        var broker = location.hostname;
        var port = 8083;
        var path = "/mqtt";
        var firstMessage = true;

        function mqttConnect() {
            var wsID = "flm-ui-mqtt-" + Date.now();
            client = new Paho.MQTT.Client(broker, port, path, wsID);
            var options = {
                timeout: connectTimeout,
                onSuccess: onConnect,
                onFailure: function() {}
            };
            client.onConnectionLost = function() {};
            client.onMessageArrived = onMessageArrived;
            client.connect(options);
        }
        function onConnect() {
            client.subscribe("/device/+/config/kube");
        }
        function onMessageArrived(msg) {
            if (firstMessage) {
                firstMessage = false;
            } else {
                paired = true;
                $scope.progress = 100;
            }
        }

        var handle;
        handle = setInterval(function() {
            if ($scope.progress >= 100) {
                $scope.closeDisabled = false;
                if (paired) {
                    $scope.progressStatus = "progress-success";
                } else {
                    $scope.progressStatus = "progress-danger";
                }
                clearInterval(handle);
                client.disconnect();
            } else {
                $scope.progress += progressDelta;
            };
            $scope.$apply();
        }, updateInterval);

        mqttConnect();
}]);

