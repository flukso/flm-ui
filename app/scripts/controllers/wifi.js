"use strict";

angular.module("flmUiApp")
    .controller("WifiCtrl", function($scope, $http, $location) {
        $scope.debug = true;
        $scope.aps = {};
        $scope.wireless = {};
        $scope.ssid = "";
        $scope.key = "";

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

        var url = "/cgi-bin/luci/rpc/sys?auth=" + $scope.sysauth;
        var request = {
            "method": "wifi.iwscan",
            "params": [],
            "id": Date.now()
        };

        $http.post(url, request)
            .success(function(response) {
                if (!response.result) {
                    $scope.alerts.push({
                        type: "error",
                        msg: response.error
                    });
                    return;
                };

                angular.forEach(response.result.ath0, function(ap, key) {
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
            })
            .error(function(response) {
                /* an invalid auth seems to trigger a 500 */
                $location.path("/");
            });

        url = "/cgi-bin/luci/rpc/uci?auth=" + $scope.sysauth;
        request = {
            "method": "get_all",
            "params": ["wireless"],
            "id": Date.now()
        };

        $http.post(url, request)
            .success(function(response) {
                if (!response.result) {
                    $scope.alerts.push({
                        type: "error",
                        msg: response.error
                    });
                    return;
                }

                $scope.wireless = response.result;

                angular.forEach(response.result, function(value, section) {
                    if (section != "wifi0" && response.result[section].ssid != "zwaluw") {
                        /* add the ssid to the scan list if it's not present yet */
                        if (!$scope.aps[response.result[section].ssid]) {
                            $scope.aps[response.result[section].ssid] =
                                {"ESSID": response.result[section].ssid};

                            if (response.result[section].encryption == "psk") {
                                $scope.aps[response.result[section].ssid].Encryption = "wpa";
                            } else if (response.result[section].encryption == "psk2") {
                                $scope.aps[response.result[section].ssid].Encryption = "wpa2";
                            } else {
                                $scope.aps[response.result[section].ssid].Encryption =
                                    response.result[section].encryption;
                            }
                        }

                        $scope.ssid = response.result[section].ssid;
                        $scope.key = response.result[section].key;
                    }
                });
            })
            .error(function(response) {
                /* an invalid auth seems to trigger a 500 */
                $location.path("/");
            });


    }
);
