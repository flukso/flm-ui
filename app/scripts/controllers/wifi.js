"use strict";

angular.module("flmUiApp")
    .controller("WifiCtrl", function($scope, $dialog, $http, $location) {
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
                '<p>{{wireless}}</p>' +
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
                });
 
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

                        $scope.section = section;
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

angular.module("flmUiApp")
    .controller("WifiSaveCtrl", ["$scope", "$location", "$http", "dialog", "wireless",
    function($scope, $location, $http, dialog, wireless) {
        $scope.wireless = wireless;
        $scope.closeDisabled = true;
        $scope.progress = 0;
        $scope.progressLog = "Saving wifi parameters: ";
        $scope.close = function(result) {
            dialog.close();
        }

        var url = "/cgi-bin/luci/rpc/uci?auth=" + $scope.sysauth;

        for (var section in wireless) {
            var request = {
                "method": "tset",
                "params": ["wireless", section, wireless[section]],
                "id": Date.now()
            };

            $http.post(url, request)
                .success(function(response) {
                    $scope.progress += 25;
                    $scope.progressLog += (response.result || response.error);
                });
        }

        url = "/cgi-bin/luci/rpc/uci?auth=" + $scope.sysauth;
        request = {
            "method": "commit",
            "params": ["wireless"],
            "id": Date.now()
        };

        $http.post(url, request)
            .success(function(response) {
                $scope.progress += 25;
                $scope.progressLog += "\nCommitting changes: ";
                $scope.progressLog += (response.result || response.error);
                $scope.progressLog += "\nRe-initializing wifi stack: ";
            });

        url = "/cgi-bin/luci/rpc/sys?auth=" + $scope.sysauth;
        request = {
            "method": "exec",
            "params": ["/sbin/wifi up"],
            "id": Date.now()
        };

        $http.post(url, request)
            .success(function(response) {
                $scope.progress += 50;
                $scope.progressLog += "\n" + (response.result || response.error);
                $scope.closeDisabled = false;
            });

    }]);
