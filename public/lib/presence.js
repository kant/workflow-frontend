define(["node-uuid", "underscore"], function (uuid, _) {

    var module = angular.module('wfPresenceService', []);

    module.factory('wfPresenceService', ['$rootScope', '$q', 'config', 'wfFeatureSwitches', 'wfUser', function($rootScope, $q, config, wfFeatureSwitches, wfUser) {

        var self = {};

        self.whenEnabled = wfFeatureSwitches.getSwitch("presence-indicator").then(function (value) {
          if(value) return true
          else reject("presence disabled");
        }, function(err) {
          console.log("error: " + err);
        });

        self.connId = uuid();

        self.endpoint = config.presenceUrl + "/" + self.connId;

        function broadcast(name, data) {
            /* use apply to make it take effect straight away */
            $rootScope.$apply(function () {
                $rootScope.$broadcast(name, data);
            });
        }

        var messageHandlers = {
            "connectionTest": function() {
                /* XXX TODO : how should I reply to this connectionTest request? */
                // console.log("recieved connection test request from server")
            },
            "subscribed": function(data) {
                self.clientId = data.clientId;
                broadcast("presence.subscribed", data);
            },
            "updated": function(data) {
                broadcast("presence.status", data);
            }
        }

        function messageHandler(msgJson) {
            var msg = JSON.parse(msgJson);
            //console.log("messageHandler", msgJson);
            if(typeof messageHandlers[msg.action] === "function") {
                messageHandlers[msg.action](msg.data);
            } else {
                console.log("receive unknown message action: " + msg.action);
                broadcast("presence.error.unknownAction", msg);
            }
        }

        var _socket = Promise.reject("not yet connected");

        function doConnection() {
            _socket = new Promise( function(resolve, reject) {
                var s = new WebSocket(self.endpoint);
                s.onerror   = function () {
                    reject();
                    broadcast("presence.connection.error");
                };
                s.onopen    = function () {
                    resolve(s);
                    broadcast("presence.connection.success");
                };
                s.onclose   = function () {
                    broadcast("presence.connection.closed");
                };
                s.onmessage = function(ev) {
                    //console.log("MESSAGE: ", ev.data);
                    messageHandler(ev.data);
                };
            });
            return _socket;
        }

        self.person = {
            firstName : wfUser.firstName,
            lastName  : wfUser.lastName,
            email     : wfUser.email,
            browserId : navigator.userAgent,
            googleId  : "00000" // required but not used
        };

        function makeRequest(action, data) {
            return { action: action, data: data };
        }

        function makeSubscriptionRequest(articleIds) {
            return makeRequest("subscribe", {
                "person": self.person,
                "subscriptionIds": articleIds
            });
        }

        /* returns a promise */
        function sendJson(data) {
            return _socket.then(function(socket) {
                socket.send(JSON.stringify(data));
                //console.log("sending: " + JSON.stringify(data));
            });
        }

        self.articleSubscribe = function(articleIds) {
            var ids = (Array.isArray(articleIds)) ? articleIds : Array(articleIds);
            var p = sendJson(makeSubscriptionRequest(ids));
            //p.then(function () { console.log("sent request: ", makeSubscriptionRequest(ids)) });
            return p;
        }

        self.whenEnabled.then(function() {
            console.log("presence is enabled... attempting connection")
            doConnection();

            $rootScope.$on("presence.connection.closed", doConnection);
            $rootScope.$on("presence.connection.error",  doConnection);

        }, function() {
            console.log("presence is disabled");
        })

        return self;

    }]);

    module.directive(
        'wfPresenceConnectionStatus', ['wfPresenceService',
        function (wfPresenceService) {
            return {
                link: function($scope, element) {

                    $scope.presenceEnabled = false;
                    $scope.connectionStatus = "disabled";

                    wfPresenceService.whenEnabled.then(function () {
                        $scope.presenceEnabled = true;
                        $scope.connectionStatus = "connecting";

                        $scope.$on("presence.connection.success", function () {
                            $scope.connectionStatus = "ok";
                        });
                        $scope.$on("presence.connection.error", function () {
                            $scope.connectionStatus = "error";
                        });

                        $scope.$on("presence.connection.closed", function () {
                            $scope.connectionStatus = "closed";
                        });
                    });
                }
            }
        }]);

    module.controller(
        'wfPresenceSubscription',
        [ "$scope", "$q", "wfPresenceService", function($scope, $q, wfPresenceService) {

            var initialData = null;

            $scope.presenceEnabled = false;

            $scope.initialData = function(id) {
                if(initialData == null) return $q.reject("no subscription has been made yet");
                else return initialData.promise.then(function (data) {
                    var found = _.find(data, function(d) {
                        return d.subscriptionId == id;
                    });
                    if(!found) return $q.reject("unknown ID: [" + id + "]");
                    else return found.currentState;
                });
            }

            wfPresenceService.whenEnabled.then(function() {
                //console.log("setting up subscription event");
                $scope.presenceEnabled = true;

                $scope.$on("presence.subscribed", function (ev, data) {
                    initialData && initialData.resolve(data.subscribedTo);
                });

                $scope.$watch(function($scope) {
                    var content = $scope["contentByStatus"];
                    return (content && getIds(content)) || [];
                }, function (newVal, oldVal) {
                    if(newVal !== oldVal) {
                        doSubscription(newVal);
                    }
                }, true);
            });

            function getIds(content) {
                return _.pluck(_.flatten(_.values(content)), "composerId")
            }

            function doSubscription(ids) {
                initialData = $q.defer();
                wfPresenceService.articleSubscribe(ids);
            }


        }]);

    module.directive('wfPresenceIndicators', [ function() {
        return {
            restrict: 'E',
            templateUrl: "/assets/components/presence-indicator/presence-indicators.html",
            scope: {
                id: "=presenceId",
                getInitialData: "&initialData",
                enabled: "="
            },
            link: function($scope) {

                // XXX TODO factor this logic out so that the knowledge of the
                // format of the data from prez is in one place

                function applyCurrentState(currentState) {
                    if(currentState.length == 0) {
                        $scope.presences = [{ status: "free", indicatorText: ""}]
                    } else {
                        $scope.presences = _.map(
                            _.uniq(currentState, false, function(s) { return s.clientId.person.email }),
                            function (pr) {
                                var person = pr.clientId.person;
                                return { indicatorText:
                                         (person.firstName.charAt(0) + person.lastName.charAt(0)).toUpperCase(),
                                         longText: [person.firstName, person.lastName].join(" "),
                                         email: person.email,
                                         status: "present" };
                            });
                    }
                }

                if($scope.enabled) {
                    $scope.getInitialData().then(function (currentState) {
                        applyCurrentState(currentState);
                    }, function (err) {
                        console.log("Error getting initial data:", err);
                    });

                    $scope.$on("presence.status", function(ev, data) {
                        if($scope.id === data.subscriptionId) {
                            applyCurrentState(data.currentState);
                        }
                    });
                }
            }
        }
    }]);
});
