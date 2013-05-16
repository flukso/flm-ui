"use strict";

angular.module("flmUiApp")
    .controller("StatusCtrl", function($scope, flmRpc) {
        $scope.debug = false;
        $scope.alerts = [];
        $scope.system = {};
        $scope.time = "";
        $scope.uptime = "";
        $scope.defaultroute = {};
        $scope.mode = "";
        $scope.iwconfig = {};
        $scope.ssid = "";
        $scope.quality = "";
        $scope.ip = "";
        $scope.ping = "";
        $scope.sync = {};

        $scope.timeSyncErr = false;
        $scope.assocErr = false;
        $scope.ipErr = false;
        $scope.pingErr = false;
        $scope.syncErr = false;
        $scope.serverSyncErr = false;
        $scope.noSync = false;
 
        $scope.closeAlert = function(index) {
            $scope.alerts.splice(index, 1);
        };

        function pushError(error) {
            $scope.alerts.push({
                type: "error",
                msg: error
            });
        };

        flmRpc.call("uci", "get_all", ["system"]).then(
            function(system) {
                angular.forEach(system, function(value, section) {
                    if (value[".type"] == "system") {
                        $scope.system = value;
                    }
                });
            },
            pushError
        );

        flmRpc.call("sys", "exec", ["date +'%s'"]).then(
            function(unixTime) {
                var time = new Date(unixTime * 1e3);
                $scope.time = time.toLocaleString();
                $scope.timeSyncErr = unixTime < 1234567890;
            },
            pushError
        );

        flmRpc.call("sys", "uptime", []).then(
            function(uptime) {
                var s = uptime % 60;
                var min = ((uptime - s) / 60) % 60;
                var h = ((uptime - min * 60 - s) / 3600) % 24;
                var days = (uptime - h * 3600 - min * 60 - s) / 86400;

                $scope.uptime = days + "days " + h + "h " + min + "min " + s + "s";
            },
            pushError
        );

        flmRpc.call("uci", "get_all", ["network"]).then(
            function(network) {
                $scope.mode = network.wan.ifname == "ath0" ? "wifi" : "ethernet";
            },
            pushError
        );

        flmRpc.call("sys", "wifi.getiwconfig", []).then(
            function(iwconfig) {
                $scope.iwconfig = iwconfig;

                if (iwconfig.ath0) {
                    $scope.ssid = iwconfig.ath0["ESSID"];
                    $scope.quality = iwconfig.ath0["Access Point"] == "Not-Associated" ?
                        "not associated" : iwconfig.ath0["Link Quality"];

                    if (iwconfig.ath0["Access Point"] == "Not-Associated") {
                        $scope.assocErr = true;
                    }
                }
            },
            pushError
        );

        flmRpc.call("sys", "net.defaultroute", []).then(
            function(defaultroute) {
                if (!defaultroute) {
                    $scope.ipErr = true;
                    /* no defaultroute = no need to even try pinging home */
                    $scope.pingErr = true;
                    $scope.ping = "aborted";
                    return;
                }

                $scope.defaultroute = defaultroute;

                var ipHigh16 = defaultroute.gateway[1][0];
                var ipLow16  = defaultroute.gateway[1][1];

                var ipByte2 = ipHigh16 % 256;
                var ipByte1 = (ipHigh16 - ipByte2) / 256;
                var ipByte4 = ipLow16 % 256;
                var ipByte3 = (ipLow16 - ipByte4) / 256;

                $scope.ip = ipByte1 + "." + ipByte2 + "." + ipByte3 + "." + ipByte4;

                flmRpc.call("sys", "net.pingtest", ["flukso.net"]).then(
                    function(code) {
                        $scope.ping = code == 0 ? "successful" : "failed";
                        $scope.pingErr = code!= 0;
                    },
                    pushError
                );
            },
            pushError
        );

        flmRpc.call("uci", "get_all", ["flukso"]).then(
            function(flukso) {
                var time = new Date(flukso.fsync.time * 1e3);

                $scope.syncErr = flukso.fsync.exit_status > 0;
                $scope.serverSyncErr = flukso.fsync.exit_status == 7;
                $scope.noSync = flukso.fsync.exit_status == -1;
                $scope.sync = {
                    time: time.toLocaleString(),
                    status: flukso.fsync.exit_string
                }
            },
            pushError
        );

    }
);
