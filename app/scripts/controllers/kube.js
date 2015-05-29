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
    .controller("KubeCtrl", ["$scope", "flmRpc", function($scope, flmRpc) {
        $scope.debug = false;
        $scope.alerts = [];
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
                    console.log(rowEntity);
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
            //client.subscribe("/device/+/config/sensor");
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

