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
    .controller("MqttCtrl", ["$scope", function($scope) {
        $scope.debug = false;
        $scope.alerts = [];
        $scope.mqtt = "";

        $scope.closeAlert = function(index) {
            $scope.alerts.splice(index, 1);
        };

        $scope.start = onConnect;
        $scope.stop = function() {
            client.unsubscribe("/sensor/+/gauge");
            client.unsubscribe("/sensor/+/counter");
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
            client.subscribe("/sensor/+/gauge");
            client.subscribe("/sensor/+/counter");
        }
        function onConnectionLost(msg) {
            if (msg.errorCode !== 0) pushError(msg.errorMessage);
            setTimeout(mqttConnect, reconnectTimeout);
        }
        function onMessageArrived(msg) {
            $scope.mqtt = Math.floor(Date.now() / 1e3) + ": "
                + msg.destinationName + " ~> "
                + msg.payloadString + "\n"
                + $scope.mqtt;
            $scope.$apply();
        }

        mqttConnect();
}]);

