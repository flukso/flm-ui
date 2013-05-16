"use strict";

angular.module("flmUiApp")
    .controller("ServicesCtrl", function($scope, $dialog, $http, flmRpc) {
        $scope.debug = false;
        $scope.alerts = [];
        $scope.daemon = {};

        $scope.closeAlert = function(index) {
            $scope.alerts.splice(index, 1);
        };

        function pushError(error) {
            $scope.alerts.push({
                type: "error",
                msg: error
            });
        };

        $scope.save = function() {
            var tpl =
                '<div class="modal-header">'+
                '<h2>Updating services configuration</h2>'+
                '</div>'+
                '<div class="modal-body">'+
                '<div class="progress progress-striped active">' +
                '<div class="bar" style="width: {{progress}}%;"></div>' +
                '</div>' +
                '<textarea id="progressLog" readonly="readonly">{{progressLog}}</textarea>'+
                /*'<p>{{flukso}}</p>' +*/
                '</div>'+
                '<div class="modal-footer">'+
                '<button ng-click="close()" class="btn btn-primary" ng-disabled="closeDisabled">Close</button>'+
                '</div>';

            var rslv = {
                flukso: function() {
                    var flukso = {};

                    flukso.daemon = {
                        enable_wan_branch: $scope.daemon.enable_wan_branch,
                        enable_lan_branch: $scope.daemon.enable_lan_branch,
                        enable_remote_upgrade: $scope.daemon.enable_remote_upgrade
                    };

                    return flukso;
                }
            };

            var opts = {
                backdrop: true,
                keyboard: false,
                backdropClick: false,
                template: tpl,
                resolve: rslv,
                controller: "ServicesSaveCtrl"

            };

            $dialog.dialog(opts).open()
                .then(function() {
                });
        };
 
        flmRpc.call("uci", "get_all", ["flukso"]).then(
            function(flukso) {
                $scope.daemon = flukso.daemon;
            },
            pushError
        );
});

angular.module("flmUiApp")
    .controller("ServicesSaveCtrl", ["$scope", "$http", "flmRpc", "dialog", "flukso",
    function($scope, $http, flmRpc, dialog, flukso) {
        $scope.flukso = flukso;
        $scope.closeDisabled = true;
        $scope.progress = 0;
        $scope.progressLog = "Saving service parameters: ";
        $scope.close = function(result) {
            dialog.close();
        }

        for (var section in flukso) {
            flmRpc.call("uci", "tset", ["flukso", section, flukso[section]]).then(
                function(result) {
                    $scope.progress += 30;
                    $scope.progressLog += result;
                },
                function(error) {
                    $scope.progressLog += error;
                }
            ); 
        }

        flmRpc.call("uci", "commit", ["flukso"]).then(
            function(result) {
                $scope.progress += 30;
                $scope.progressLog += "\nCommitting changes: " + result;
            },
            function(error) {
                $scope.progressLog += "\nCommitting changes: " + error;
            }
        ); 

        flmRpc.call("sys", "exec", ["/etc/init.d/flukso restart"]).then(
            function(result) {
                $scope.progress += 40;
                $scope.progressLog += "\nRestarting the Flukso daemon: ok";
                $scope.closeDisabled = false;
            },
            function(error) {
                $scope.progressLog += "\nRestarting the Flukso daemon: " + error;
                $scope.closeDisabled = false;
            }
        ); 
    }]);
