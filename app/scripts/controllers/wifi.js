"use strict";

angular.module("flmUiApp")
    .controller("WifiCtrl", function($scope, $dialog, $http, flmRpc) {
        $scope.debug = false;
        $scope.alerts = [];
        $scope.aps = {};
        $scope.wireless = {};
        $scope.ssid = "";
        $scope.key = "";

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

            return $scope.aps[$scope.ssid].Encryption == "none";
        }

        $scope.pattern = function() {
            if (!$scope.aps[$scope.ssid]) {
                return /.*/;
            }

            switch ($scope.aps[$scope.ssid].Encryption) {
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
                '<div class="progress progress-striped active">' +
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
                    switch ($scope.aps[$scope.ssid].Encryption) {
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
                        encryption: wpa2psk($scope.aps[$scope.ssid].Encryption),
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
                                if (section != "wifi0") {
                                    $scope.section = section;
                                }
                            });
                        },
                        pushError
                    );
                });
        };

        flmRpc.call("sys", "wifi.iwscan", []).then(
            function(iwscan) {
                angular.forEach(iwscan.ath0, function(ap, key) {
                    $scope.aps[ap.ESSID] = ap;

                    if (ap["Encryption key"] == "off") {
                        $scope.aps[ap.ESSID].Encryption = "none";
                    } else {
                        if (!ap["Authentication Suites (1) "]) {
                            $scope.aps[ap.ESSID].Encryption = "wep";
                        } else {
                            if ((ap["Pairwise Ciphers (2) "] && ap["Pairwise Ciphers (2) "].indexOf("CCMP") != -1)
                             || (ap["Pairwise Ciphers (1) "] && ap["Pairwise Ciphers (1) "].indexOf("CCMP") != -1)) {
                                $scope.aps[ap.ESSID].Encryption = "wpa2";
                            } else {
                                $scope.aps[ap.ESSID].Encryption = "wpa";
                            }
                        }
                    }
                });
            },
            pushError
        );

        flmRpc.call("uci", "get_all", ["wireless"]).then(
            function(wireless) {
                $scope.wireless = wireless;

                angular.forEach(wireless, function(value, section) {
                    if (section != "wifi0" && wireless[section].ssid != "zwaluw") {
                        /* add the ssid to the scan list if it's not present yet */
                        if (!$scope.aps[wireless[section].ssid]) {
                            $scope.aps[wireless[section].ssid] =
                                {"ESSID": wireless[section].ssid};

                            if (wireless[section].encryption == "psk") {
                                $scope.aps[wireless[section].ssid].Encryption = "wpa";
                            } else if (wireless[section].encryption == "psk2") {
                                $scope.aps[wireless[section].ssid].Encryption = "wpa2";
                            } else {
                                $scope.aps[wireless[section].ssid].Encryption =
                                    wireless[section].encryption;
                            }
                        }

                        $scope.ssid = wireless[section].ssid;
                        $scope.key = wireless[section].key;
                    }

                    if (section != "wifi0") {
                        $scope.section = section;
                    }
                });
            },
            pushError
        );
    }
);

angular.module("flmUiApp")
    .controller("WifiSaveCtrl", ["$scope", "$http", "flmRpc", "dialog", "wireless",
    function($scope, $http, flmRpc, dialog, wireless) {
        $scope.wireless = wireless;
        $scope.closeDisabled = true;
        $scope.progress = 0;
        $scope.progressLog = "Saving wifi parameters: ";
        $scope.close = function(result) {
            dialog.close();
        }

        for (var section in wireless) {
            flmRpc.call("uci", "tset", ["wireless", section, wireless[section]]).then(
                function(result) {
                    $scope.progress += 25;
                    $scope.progressLog += result;
                },
                function(error) {
                    $scope.progressLog += error;
                }
            );
        }

        flmRpc.call("uci", "commit", ["wireless"]).then(
            function(result) {
                $scope.progress += 25;
                $scope.progressLog += "\nCommitting changes: " + result;
                $scope.progressLog += "\nRe-initializing wifi stack: ";
            },
            function(error) {
                $scope.progressLog += "\nCommitting changes: " + error;
                $scope.progressLog += "\nRe-initializing wifi stack: ";
            }
        );

        /* using a special error function here, so we cannot invoke flmRpc */
        var url = "/cgi-bin/luci/rpc/sys?auth=" + $scope.sysauth;
        var request = {
            "method": "exec",
            "params": ["/sbin/wifi up"],
            "id": Date.now()
        };

        $http.post(url, request)
            .success(function(response) {
                $scope.progress += 50;
                $scope.progressLog += "\n" + (response.result || response.error);
                $scope.closeDisabled = false;
            })
            .error(function(response) {
                $scope.progress += 50;
                $scope.progressLog += "\nHTTP error. Most likely due to an incorrect wifi key or an out-of-range access point."; 
                $scope.closeDisabled = false;
            });
    }]);
