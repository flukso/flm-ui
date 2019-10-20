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
    .controller("LoraCtrl", function($scope, $modal, flmRpc) {
        $scope.debug = false;
        $scope.alerts = [];
        $scope.enable = false;
        $scope.otaa = {};

        $scope.closeAlert = function(index) {
            $scope.alerts.splice(index, 1);
        };

        function pushError(error) {
            $scope.alerts.push({
                type: "error",
                msg: error
            });
        };

        $scope.pattern = (function() {
            var regex = /^[\w\.\-]{1,32}$/;

            return {
                test: function(value) {
                    return regex.test(value);
                }
            };
        })();

        $scope.save = function() {
            var tpl =
                '<div class="modal-header">'+
                '<h2>Updating network configuration</h2>'+
                '</div>'+
                '<div class="modal-body">'+
                '<div class="progress progress-striped {{progressStatus}} active">' +
                '<div class="bar" style="width: {{progress}}%;"></div>' +
                '</div>' +
                '<textarea id="progressLog" readonly="readonly">{{progressLog}}</textarea>'+
                /*'<p>{{enable}}</p>' +*/
                /*'<p>{{otaa}}</p>' +*/
                '</div>'+
                '<div class="modal-footer">'+
                '<button ng-click="close()" class="btn btn-primary" ng-disabled="closeDisabled">Close</button>'+
                '</div>';

            var rslv = {
                lora: function() {
                    var lora = { };

                    lora.main = {
                        enable:  $scope.enable
                    }
                    lora.otaa = $scope.otaa
                    return lora;
                }
            };

            var opts = {
                backdrop: true,
                keyboard: false,
                backdropClick: false,
                template: tpl,
                resolve: rslv,
                controller: "LoraSaveCtrl"
            };

            $modal.open(opts).result
                .then(function() {
                });
        };

        flmRpc.call("uci", "get_all", ["lora"])
        .then(function(lora) {
                $scope.enable = lora.main.enable;
                $scope.otaa = lora.otaa;
            },
            pushError)
    });

angular.module("flmUiApp")
    .controller("LoraSaveCtrl", ["$scope", "$q", "flmRpc", "$modalInstance", "lora",
    function($scope, $q, flmRpc, $modalInstance, lora) {
        $scope.closeDisabled = true;
        $scope.progress = 0;
        $scope.progressStatus = "progress-info";
        $scope.progressLog = "Saving lora parameters: ";
        $scope.close = function(result) {
            $modalInstance.close();
        }

        var promiseUci = [];

        for (var section in lora) {
            var promise = flmRpc.call("uci", "tset", ["lora", section, lora[section]]).then(
                function(result) {
                    $scope.progressLog += ".";
                },
                function(error) {
                    $scope.progressLog += "\n" + error;
                }
            );

            promiseUci.push(promise);
        }

        $q.all(promiseUci)
        .finally(function () {
            $scope.progress = 50;
            $scope.progressLog += "\nCommitting changes.";
            flmRpc.call("uci", "commit", ["lora"]);
            $scope.progressLog += "\nRestarting flukso daemon..";
            flmRpc.call("sys", "exec", ["/etc/init.d/flukso restart"])
            .then(setTimeout(function() {
                $scope.progressLog += "\nDone."
                $scope.progress += 50;
                if ($scope.progress == 100) {
                    $scope.progressStatus = "progress-success";
                } else {
                    $scope.progressStatus = "progress-danger";
                };
                $scope.closeDisabled = false;
                $scope.$apply();
            }, 5000));
        });
    }]);
