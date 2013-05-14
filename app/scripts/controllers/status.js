"use strict";

angular.module("flmUiApp")
    .controller("StatusCtrl", function($scope, $http, $location, flmRpc) {
        $scope.debug = false;
        $scope.alerts = [];
        $scope.system = {};
        $scope.time = "";
        $scope.timeSyncErr = false;
        $scope.uptime = "";
        $scope.defaultroute = {};
        $scope.mode = "";
        $scope.ip = "";
        $scope.ping = "";
        $scope.sync = {};

        $scope.closeAlert = function(index) {
            $scope.alerts.splice(index, 1);
        };

        flmRpc.call("uci", "get_all", ["system"]).then(
            function(system) {
                angular.forEach(system, function(value, section) {
                    if (value[".type"] == "system") {
                        $scope.system = value;
                    }
                });
            },
            function(error) {
                $scope.alerts.push({
                    type: "error",
                    msg: error
                });
            }
        );

        flmRpc.call("sys", "exec", ["date +'%s'"]).then(
            function(unixTime) {
                var time = new Date(unixTime * 1e3);
                $scope.time = time.toLocaleString();
                $scope.timeSyncErr = unixTime < 1234567890;
            },
            function(error) {
                $scope.alerts.push({
                    type: "error",
                    msg: error
                });
            }
        );

        flmRpc.call("sys", "uptime", []).then(
            function(uptime) {
                var s = uptime % 60;
                var min = ((uptime - s) / 60) % 60;
                var h = ((uptime - min * 60 - s) / 3600) % 24;
                var days = (uptime - h * 3600 - min * 60 - s) / 86400;

                $scope.uptime = days + "days " + h + "h " + min + "min " + s + "s";
            },
            function(error) {
                $scope.alerts.push({
                    type: "error",
                    msg: error
                });
            }
        );

        flmRpc.call("sys", "net.defaultroute", []).then(
            function(defaultroute) {
                $scope.defaultroute = defaultroute;
                $scope.mode = defaultroute.device == "ath0" ? "wifi" : "ethernet";

                var ipHigh16 = defaultroute.gateway[1][0];
                var ipLow16  = defaultroute.gateway[1][1];

                var ipByte2 = ipHigh16 % 256;
                var ipByte1 = (ipHigh16 - ipByte2) / 256;
                var ipByte4 = ipLow16 % 256;
                var ipByte3 = (ipLow16 - ipByte4) / 256;

                $scope.ip = ipByte1 + "." + ipByte2 + "." + ipByte3 + "." + ipByte4;
            },
            function(error) {
                $scope.alerts.push({
                    type: "error",
                    msg: error
                });
            }
        );
        
        flmRpc.call("sys", "net.pingtest", ["flukso.net"]).then(
            function(code) {
                $scope.ping = code == 0 ? "successful" : "failed";
            },
            function(error) {
                $scope.alerts.push({
                    type: "error",
                    msg: error
                });
            }
        );

        flmRpc.call("uci", "get_all", ["flukso"]).then(
            function(flukso) {
                var time = new Date(flukso.fsync.time * 1e3);

                $scope.sync = {
                    time: time.toLocaleString(),
                    status: flukso.fsync.exit_string
                }
            },
            function(error) {
                $scope.alerts.push({
                    type: "error",
                    msg: error
                });
            }
        );

    }
);
