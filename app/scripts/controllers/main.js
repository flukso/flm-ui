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
    .controller("MainCtrl", function ($rootScope, $scope, $http, $location) {
        $rootScope.sysauth = "0123456789abcdef0123456789abcdef";
        $scope.user = "root";
        $scope.pass = "root";
        $scope.alerts = [];

        $scope.closeAlert = function(index) {
            $scope.alerts.splice(index, 1);
        };

        $scope.rpcLogin = function() {
            var url = "/cgi-bin/luci/rpc/auth";
            var request = {
                "method": "login",
                "params": [$scope.user, $scope.pass],
                "id": Date.now()
            };

            $http.post(url, request).success(function(response) {
                if (response.result) {
                    $rootScope.sysauth = response.result;
                    $location.path("/status");
                } else {
                    $scope.alerts.push({
                        type: "error",
                        msg: "Wrong username or password. Please try again."
                    });
                };
            });
        };
    });
