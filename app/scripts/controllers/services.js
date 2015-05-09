/**
 * Copyright (c) 2015 Bart Van Der Meerssche <bart@flukso.net>
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
    .controller("ServicesCtrl", function($scope, $dialog, flmRpc) {
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
                '<div class="progress progress-striped {{progressStatus}} active">' +
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
    .controller("ServicesSaveCtrl", ["$scope", "$q", "flmRpc", "dialog", "flukso",
    function($scope, $q, flmRpc, dialog, flukso) {
        $scope.flukso = flukso;
        $scope.closeDisabled = true;
        $scope.progress = 0;
        $scope.progressStatus = "progress-info";
        $scope.progressLog = "Saving service parameters: ";
        $scope.close = function(result) {
            dialog.close();
        }

        var promiseUci = [];

        for (var section in flukso) {
            var promise = flmRpc.call("uci", "tset", ["flukso", section, flukso[section]]).then(
                function(result) {
                    $scope.progress += 30;
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
            flmRpc.call("uci", "commit", ["flukso"])
            .then(
                function(result) {
                    $scope.progress += 30;
                    $scope.progressLog += "\nCommitting changes: " + result;
                },
                function(error) {
                    $scope.progressLog += "\nCommitting changes: " + error;
                })
            .always(function () {
                flmRpc.call("sys", "exec", ["/etc/init.d/flukso restart"])
                .then(
                    function(result) {
                        $scope.progress += 40;
                        $scope.progressLog += "\nRestarting the Flukso daemon: ok";
                    },
                    function(error) {
                        $scope.progressLog += "\nRestarting the Flukso daemon: " + error;
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
