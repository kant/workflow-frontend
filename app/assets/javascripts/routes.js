define(['angular', 'app'], function(angular, app) {

    'use strict';

    return app.config(['$routeProvider', function($routeProvider) {
                 $routeProvider.when('/dashboard', {templateUrl: 'dashboard', controller: 'DashboardCtrl'});
                 $routeProvider.when('/stubs', {templateUrl: 'stubs', controller: 'StubsCtrl'});
                 $routeProvider.otherwise({redirectTo: '/dashboard'});
               }]);
});
