/**
 * Copyright (c) 2017 Bart Van Der Meerssche <bart@flukso.net>
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
    .controller("GaugeCtrl", function($scope) {
        $scope.debug = false;
        $scope.alerts = [];
        $scope.maxPorts = 3;
        $scope.maxGauges = 11;
        $scope.justGauge = [[ ], [ ], [ ]];

        $scope.closeAlert = function(index) {
            $scope.alerts.splice(index, 1);
        };

        function pushError(error) {
            $scope.alerts.push({
                type: "error",
                msg: error
            });
        };

        var defaultColors = [
            "#a9d70b",
            "#f9c802",
            "#ff0000"
        ];
        var vrmsColors = [
            "#ff0000",
            "#ff0000",
            "#ff0000",
            "#ff0000",
            "#ff0000",
            "#ff0000",
            "#ff0000",
            "#ff0000",
            "#ff0000",
            "#ff0000",
            "#ff0000",
            "#ff0000",
            "#ff0000",
            "#ff0000",
            "#ff0000",
            "#ff0000",
            "#f9c802",
            "#a9d70b",
            "#a9d70b",
            "#f9c802",
            "#ff0000",
            "#ff0000",
            "#ff0000",
            "#ff0000",
            "#ff0000",
            "#ff0000",
            "#ff0000",
            "#f9c802",
            "#f9c802",
            "#a9d70b",
            "#a9d70b",
            "#a9d70b",
            "#a9d70b",
            "#f9c802",
            "#f9c802",
            "#ff0000",
            "#ff0000",
            "#ff0000",
            "#ff0000",
            "#ff0000",
        ];
        var pfColors = [
            "#ff0000",
            "#ff0000",
            "#ff0000",
            "#ff0000",
            "#ff0000",
            "#ff0000",
            "#ff0000",
            "#f9c802",
            "#f9c802",
            "#a9d70b"
        ];
        var subtype2gauge = {
            pplus: {
                title: "P+",
                label: "W",
                max: "power",
                decimals: 0,
                colors: defaultColors
            },
            pminus: {
                title: "P-",
                label: "W",
                max: "power",
                decimals: 0,
                colors: defaultColors
            },
            q1: {
                title: "Q1",
                label: "VAr",
                max: "power",
                decimals: 0,
                colors: defaultColors
            },
            q2: {
                title: "Q2",
                label: "VAr",
                max: "power",
                decimals: 0,
                colors: defaultColors
            },
            q3: {
                title: "Q3",
                label: "VAr",
                max: "power",
                decimals: 0,
                colors: defaultColors
            },
            q4: {
                title: "Q4",
                label: "VAr",
                max: "power",
                decimals: 0,
                colors: defaultColors
            },
            vrms: {
                title: "Vrms",
                label: "V",
                max: 300,
                decimals: 1,
                colors: vrmsColors
            },
            irms: {
                title: "Irms",
                label: "A",
                max: "current",
                decimals: 2,
                colors: defaultColors
            },
            vthd: {
                title: "Vthd",
                label: "-",
                max: 1,
                decimals: 2,
                colors: defaultColors
            },
            ithd: {
                title: "Ithd",
                label: "-",
                max: 1,
                decimals: 2,
                colors: defaultColors
            },
            pf: {
                title: "Pf",
                label: "-",
                max: 1,
                decimals: 2,
                colors: pfColors
            }
        };

        var client;
        var connectTimeout = 30; /* secs */
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
            client.onMessageArrived = onFlxMessageArrived;
            client.connect(options);
        }
        function onConnect() {
            client.subscribe("/device/+/config/flx");
        }
        function onConnectionLost(msg) {
            if (msg.errorCode !== 0) pushError(msg.errorMessage);
            setTimeout(mqttConnect, reconnectTimeout);
        }
        function onFlxMessageArrived(msg) {
            console.log(msg.payloadString);
            var flx = JSON.parse(msg.payloadString);
            $scope.port = [];
            for (var port in flx) {
                if (parseInt(port)) { /* making sure we've got a port entry */
                    $scope.port[parseInt(port)] = {
                        name: flx[port].name,
                        current: flx[port].current
                    };
                }
            }
            client.unsubscribe("/device/+/config/flx");
            client.onMessageArrived = onSensorMessageArrived;
            client.subscribe("/device/+/config/sensor");
        }
        function onSensorMessageArrived(msg) {
            function max(max, port) {
                switch(max) {
                case "power":
                    return 230 * $scope.port[port].current;
                    break;
                case "current":
                    return $scope.port[port].current;
                    break;
                default:
                    return max;
                    break;
                }
            };
            console.log(msg.payloadString);
            var sensor = JSON.parse(msg.payloadString);
            $scope.sensor= [];
            for (var idx in sensor) {
                var iidx = parseInt(idx);
                if (iidx && iidx < 37 && (iidx - 1) % 12 != 9 &&
                                         (iidx - 1) % 12 != 11)  {
                    var port = Math.floor((iidx - 1) / 12) + 1;
                    var gauge = ((iidx - 1) % 12 + 1);
                    $scope.sensor[sensor[idx].id] = {
                        idx: iidx,
                        subtype: sensor[idx].subtype,
                        cache: 0,
                        gauge: new JustGage({
                            id: "gauge-" + port + "-" + gauge,
                            noGradient: true,
                            refreshAnimationTime: 50,
                            levelColors: subtype2gauge[sensor[idx].subtype].colors,
                            value: 0,
                            min: 0,
                            max: max(subtype2gauge[sensor[idx].subtype].max, port),
                            title: subtype2gauge[sensor[idx].subtype].title,
                            label: subtype2gauge[sensor[idx].subtype].label,
                            decimals: subtype2gauge[sensor[idx].subtype].decimals
                        })
                    }
                }
            }
            client.unsubscribe("/device/+/config/sensor");
            client.onMessageArrived = onGaugeMessageArrived;
            client.subscribe("/sensor/+/gauge");
        }
        function onGaugeMessageArrived(msg) {
            var topic = msg.destinationName.split("/");
            var reading = JSON.parse(msg.payloadString);
            if ($scope.sensor[topic[2]] &&
                        $scope.sensor[topic[2]].cache != reading[1]) {
                $scope.sensor[topic[2]].cache = reading[1];
                $scope.sensor[topic[2]].gauge.refresh(reading[1]);
            }
        }

        mqttConnect();
});

