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
    .controller("NetworkCtrl", function($scope, $modal, flmRpc) {
        $scope.debug = false;
        $scope.alerts = [];
        $scope.interface = null;
        $scope.network = {};
        $scope.aps = {};
        $scope.wireless = {};
        $scope.ssid = "";
        $scope.key = "";
        $scope.ssidDisable = true;

        $scope.closeAlert = function(index) {
            $scope.alerts.splice(index, 1);
        };

        function pushError(error) {
            $scope.alerts.push({
                type: "error",
                msg: error
            });
        };

        /*
        owrt-encryption     enabled     wep     wpa     pair_ciphers
        none                false       false   0       []
        wep                 true        true    0       []
        psk                 true        false   1       ["TKIP"]
        psk+ccmp            true        false   1       ["CCMP"]
        psk+tkip+ccmp       true        false   1       ["TKIP","CCMP"]
        psk2+tkip           true        false   2       ["TKIP"]
        psk2                true        false   2       ["CCMP"]
        psk2+tkip+ccmp      true        false   2       ["TKIP","CCMP"]
        psk-mixed+tkip      true        false   3       ["TKIP"]
        psk-mixed+ccmp      true        false   3       ["CCMP"]
        psk-mixed           true        false   3       ["TKIP","CCMP"]
        */

        function scan2encrypt(ap) {
            if (!ap.encryption.enabled)
                return "none";
            if (ap.encryption.wep)
                return "wep";

            function stringCipher(arrCipher) {
                return arrCipher.toString().toLowerCase().replace(/,/g, "+");
            }

            var encr;

            switch (ap.encryption.wpa) {
            case 1:
                encr = "psk+" + stringCipher(ap.encryption.pair_ciphers);
                break;
            case 2:
                encr = "psk2+" + stringCipher(ap.encryption.pair_ciphers);
                break;
            case 3:
                encr = "psk-mixed+" + stringCipher(ap.encryption.pair_ciphers);
                break;
            }

            switch (encr) {
            case "psk+tkip":
                encr = "psk";
                break;
            case "psk2+ccmp":
                encr = "psk2";
                break;
            case "psk-mixed+tkip+ccmp":
                encr = "psk-mixed";
                break;            
            }

            return encr;
        }

        function uciEncr2descr(encr) {
            var descr =
            {
                "none": "None",
                "wep" : "WEP Open/Shared (NONE)",
                "psk" : "WPA PSK (TKIP)",
                "psk+ccmp" : "WPA PSK (CCMP)",
                "psk+tkip+ccmp" : "WPA PSK (TKIP, CCMP)",
                "psk2" : "WPA2 PSK (CCMP)",
                "psk2+tkip" : "WPA2 PSK (TKIP)",
                "psk2+tkip+ccmp": "WPA2 PSK (TKIP, CCMP)",
                "psk-mixed": "mixed WPA/WPA2 PSK (TKIP, CCMP)",
                "psk-mixed+tkip": "mixed WPA/WPA2 PSK (TKIP)",
                "psk-mixed+ccmp": "mixed WPA/WPA2 PSK (CCMP)",
            };

            return descr[encr];
        }

        $scope.disable = function() {
            if (!$scope.aps[$scope.ssid]) {
                return true;
            }

            return $scope.aps[$scope.ssid].uciEncr == "none";
        };

        /* duck typing in action
           see:  http://stackoverflow.com/questions/18900308/angularjs-dynamic-ng-pattern-validation */
        $scope.pattern = (function() {
            var regex = {
                "wep": /(^.{5}$)|(^.{13}$)|(^[a-fA-F0-9]{10}$)|(^[a-fA-F0-9]{26}$)/,
                "wpa": /^.{8,63}$/
            };

            return {
                test: function(value) { 
                    if (!$scope.aps[$scope.ssid]) {
                        return true;
                    }

                    switch ($scope.aps[$scope.ssid].uciEncr) {
                    case "none":
                        return true;
                    case "wep":
                        return regex.wep.test(value);
                    default:
                        return regex.wpa.test(value);
                    }
                }
            };
        })();

        $scope.save = function() {
            var tpl =
                '<div class="modal-header">'+
                '<h2>Updating wifi configuration</h2>'+
                '</div>'+
                '<div class="modal-body">'+
                '<div class="progress progress-striped {{progressStatus}} active">' +
                '<div class="bar" style="width: {{progress}}%;"></div>' +
                '</div>' +
                '<textarea id="progressLog" readonly="readonly">{{progressLog}}</textarea>'+
                /*'<p>{{wireless}}</p>' +*/
                '</div>'+
                '<div class="modal-footer">'+
                '<button ng-click="close()" class="btn btn-primary" ng-disabled="closeDisabled">Close</button>'+
                '</div>';

            var rslv = {
                network: function() {
                    var network = { wan : {}};

                    switch($scope.interface) {
                    case "wifi":
                        network.wan.ifname = "wlan0";
                        break;
                    case "ethernet":
                        network.wan.ifname = "eth1";
                        break;
                    }

                    return network;
                },
                wireless: function() {
                    var wireless = {};

                    function ascii2hex(str) {
                        var hexstr = "";
                        for (var i=0; i<str.length; i++) {
                            hexstr += str.charCodeAt(i).toString(16);
                        }
                        return hexstr;
                    }

                    if (!$scope.ssid) {
                        return wireless;
                    }
                    /* sanitize the key entry */
                    switch ($scope.aps[$scope.ssid].uciEncr) {
                    case "none":
                        $scope.key = "";
                        break;
                    case "wep":
                        switch ($scope.key.length) {
                            case 5:
                            case 13:
                                $scope.key = ascii2hex($scope.key);
                        }
                        break;
                    }

                    wireless[$scope.section] = {
                        ssid: $scope.ssid,
                        encryption: $scope.aps[$scope.ssid].uciEncr,
                        key: $scope.key
                    };

                    return wireless;
                }
            };

            var opts = {
                backdrop: true,
                keyboard: false,
                backdropClick: false,
                template: tpl,
                resolve: rslv,
                controller: "NetworkSaveCtrl"
            };

            $modal.open(opts).result
                .then(function() {
                    flmRpc.call("uci", "get_all", ["wireless"]).then(
                        function(wireless) {
                            angular.forEach(wireless, function(value, section) {
                                if (section != "radio0") {
                                    /* the anonymous wifi-iface section
                                       will have a new section id */
                                    $scope.section = section;
                                }
                            });
                        },
                        pushError
                    );
                });
        };

        flmRpc.call("uci", "get_all", ["network"])
        .then(function(network) {
                $scope.network = network;

                switch(network.wan.ifname) {
                case "wlan0":
                    $scope.interface = "wifi";
                    break;
                case "eth1":
                    $scope.interface = "ethernet";
                    break;
                }
            },
            pushError)

        flmRpc.call("sys", "wifi.iwinfo", ["wlan0", "scanlist"])
        .then(function(iwinfo) {
                $scope.ssidDisable = false;

                if (!iwinfo) {
                    return;
                }
                angular.forEach(iwinfo.scanlist, function(ap, key) {
                    $scope.aps[ap.ssid] = ap;
                    $scope.aps[ap.ssid].quality = ap.quality + "/" + ap.quality_max;
                    $scope.aps[ap.ssid].uciEncr = scan2encrypt(ap);
                });
            },
            pushError)
        .finally(function() {
            flmRpc.call("uci", "get_all", ["wireless"])
            .then(
                function(wireless) {
                    $scope.wireless = wireless;

                    angular.forEach(wireless, function(value, section) {
                        if (section != "radio0" && wireless[section].ssid != "zwaluw") {
                            /* add the stored ssid to the scan list if it's not present yet */
                            if (!$scope.aps[wireless[section].ssid]) {
                                $scope.aps[wireless[section].ssid] =
                                {
                                    "ssid": wireless[section].ssid,
                                    "channel": "-",
                                    "quality": "-",
                                    "uciEncr": wireless[section].encryption,
                                    "encryption":
                                    {
                                        "description": uciEncr2descr(wireless[section].encryption)
                                    }
                                };
                            }

                            $scope.ssid = wireless[section].ssid;
                            $scope.key = wireless[section].key;
                        }

                        if (section != "radio0") {
                            $scope.section = section;
                        }
                    });
                },
                pushError)
        });
    });

angular.module("flmUiApp")
    .controller("NetworkSaveCtrl", ["$scope", "$q", "flmRpc", "$modalInstance", "network", "wireless",
    function($scope, $q, flmRpc, $modalInstance, network, wireless) {
        $scope.wireless = wireless;
        $scope.closeDisabled = true;
        $scope.progress = 0;
        $scope.progressStatus = "progress-info";
        $scope.progressLog = "Saving network parameters: ";
        $scope.close = function(result) {
            $modalInstance.close();
        }

        var promiseUci = [];

        for (var section in network) {
            var promise = flmRpc.call("uci", "tset", ["network", section, network[section]]).then(
                function(result) {
                    $scope.progressLog += result + " ";
                },
                function(error) {
                    $scope.progressLog += "\n" + error;
                }
            );

            promiseUci.push(promise);
        }
        if (network.wan.iname == "wlan0") {
            for (var section in wireless) {
                var promise = flmRpc.call("uci", "tset", ["wireless", section, wireless[section]]).then(
                    function(result) {
                        $scope.progressLog += result + " ";
                    },
                    function(error) {
                        $scope.progressLog += "\n" + error;
                    }
                );

                promiseUci.push(promise);
            }
        }

        $q.all(promiseUci)
        .finally(function () {
            $scope.progress = 50;
            flmRpc.call("uci", "commit", ["network"]);
            flmRpc.call("uci", "commit", ["wireless"]);
            $scope.progressLog += "\nCommitting changes.";
            flmRpc.call("sys", "exec", ["/etc/init.d/network restart"]);
            $scope.progressLog += "\nRestarting network stack.";
            $scope.progress = 100;
            $scope.progressStatus = "progress-success";
            $scope.closeDisabled = false;
        });
    }]);
