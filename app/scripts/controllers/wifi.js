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
    .controller("WifiCtrl", function($scope, $dialog, flmRpc) {
        $scope.debug = false;
        $scope.alerts = [];
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

        $scope.disable = function() {
            if (!$scope.aps[$scope.ssid]) {
                return true;
            }

            return $scope.aps[$scope.ssid].crypt == "none";
        };

        $scope.pattern = function() {
            if (!$scope.aps[$scope.ssid]) {
                return /.*/;
            }

            switch ($scope.aps[$scope.ssid].crypt) {
                case "none":
                    return /.*/; /* don't care */
                case "wep":
                    return /(^.{5}$)|(^.{13}$)|(^[a-fA-F0-9]{10}$)|(^[a-fA-F0-9]{26}$)/;
                case "wpa":
                case "wpa2":
                    return /^.{8,63}$/;
            }
        };

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
                wireless: function() {
                    var wireless = {};

                    function ascii2hex(str) {
                        var hexstr = "";
                        for (var i=0; i<str.length; i++) {
                            hexstr += str.charCodeAt(i).toString(16);
                        }
                        return hexstr;
                    }

                    function wpa2psk(encr) {
                        switch (encr) {
                            case "wpa":
                                return "psk";
                            case "wpa2":
                                return "psk2";
                        }
                        return encr;
                    }

                    /* sanitize the key entry */
                    switch ($scope.aps[$scope.ssid].crypt) {
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
                        encryption: wpa2psk($scope.aps[$scope.ssid].crypt),
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
                controller: "WifiSaveCtrl"

            };

            $dialog.dialog(opts).open()
                .then(function() {
                    flmRpc.call("uci", "get_all", ["wireless"]).then(
                        function(wireless) {
                            angular.forEach(wireless, function(value, section) {
                                if (section != "radio0") {
                                    $scope.section = section;
                                }
                            });
                        },
                        pushError
                    );
                });
        };

        flmRpc.call("sys", "wifi.iwinfo", ["wlan0", "scanlist"]).then(
            function(iwinfo) {
                $scope.ssidDisable = false;

                angular.forEach(iwinfo.scanlist, function(ap, key) {
                    $scope.aps[ap.ssid] = ap;
                    $scope.aps[ap.ssid].quality = ap.quality + "/" + ap.quality_max;

                    $scope.aps[ap.ssid].crypt = ap.encryption.wep ? "wep" : "none";

                    if (ap.encryption.wpa == 1) {
                        $scope.aps[ap.ssid].crypt = "wpa";
                    }
                    else if (ap.encryption.wpa > 1) { /* WPA2 or mixed */
                        $scope.aps[ap.ssid].crypt = "wpa2";
                    }
                });
            },
            pushError
        );

        flmRpc.call("uci", "get_all", ["wireless"]).then(
            function(wireless) {
                $scope.wireless = wireless;

                angular.forEach(wireless, function(value, section) {
                    if (section != "radio0" && wireless[section].ssid != "zwaluw") {
                        /* add the ssid to the scan list if it's not present yet */
                        if (!$scope.aps[wireless[section].ssid]) {
                            $scope.aps[wireless[section].ssid] =
                                {"ssid": wireless[section].ssid};

                            if (wireless[section].encryption == "psk") {
                                $scope.aps[wireless[section].ssid].crypt = "wpa";
                            } else if (wireless[section].encryption == "psk2") {
                                $scope.aps[wireless[section].ssid].crypt = "wpa2";
                            } else {
                                $scope.aps[wireless[section].ssid].crypt =
                                    wireless[section].encryption;
                            }
                        }

                        $scope.ssid = wireless[section].ssid;
                        $scope.key = wireless[section].key;
                    }

                    if (section != "radio0") {
                        $scope.section = section;
                    }
                });
            },
            pushError
        );
    }
);

angular.module("flmUiApp")
    .controller("WifiSaveCtrl", ["$scope", "$q", "flmRpc", "dialog", "wireless",
    function($scope, $q, flmRpc, dialog, wireless) {
        $scope.wireless = wireless;
        $scope.closeDisabled = true;
        $scope.progress = 0;
        $scope.progressStatus = "progress-info";
        $scope.progressLog = "Saving wifi parameters: ";
        $scope.close = function(result) {
            dialog.close();
        }

        var promiseUci = [];

        for (var section in wireless) {
            var promise = flmRpc.call("uci", "tset", ["wireless", section, wireless[section]]).then(
                function(result) {
                    $scope.progress += 25;
                    $scope.progressLog += result;
                },
                function(error) {
                    $scope.progressLog += error;
                }
            );

            promiseUci.push(promise);
        }

        $q.all(promiseUci)
        .always(function () {
            flmRpc.call("uci", "commit", ["wireless"])
            .then(
                function(result) {
                    $scope.progress += 25;
                    $scope.progressLog += "\nCommitting changes: " + result;
                },
                function(error) {
                    $scope.progressLog += "\nCommitting changes: " + error;
                })
            .always(function () {
                flmRpc.call("sys", "exec", ["/sbin/wifi up"])
                .then(
                    function(result) {
                        $scope.progress += 50;
                        $scope.progressLog += "\nRe-initializing wifi stack";
                    },
                    function(error) { 
                        $scope.progressLog += "\nRe-initializing wifi stack: " + error;
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
       });
    }]);
