"use strict";

angular.module("flmUiApp")
    .controller("SyslogCtrl", function($scope, flmRpc) {
        $scope.debug = false;
        $scope.alerts = [];
        $scope.syslog = "";

        $scope.closeAlert = function(index) {
            $scope.alerts.splice(index, 1);
        };

        function pushError(error) {
            $scope.alerts.push({
                type: "error",
                msg: error
            });
        };

        flmRpc.call("sys", "syslog", []).then(
            function(syslog) {
                $scope.syslog = syslog;
            },
            pushError
        );
});


