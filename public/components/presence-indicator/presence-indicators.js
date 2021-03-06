import presenceIndicatorsTemplate from './presence-indicators.html';
import _ from 'lodash';

function wfPresenceIndicatorsDirective ($rootScope, wfPresenceService,
                                        wfPresenceInitialData, $log) {

    return {
        restrict: 'E',
        template: presenceIndicatorsTemplate,
        scope: {
            id: "=presenceId",
            inDrawer: "=inDrawer"
        },
        link: ($scope) => {

            function applyCurrentState(currentState) {
                if(currentState.length === 0) {
                    $scope.presences = [{ status: "free", indicatorText: ""}];
                } else {
                    $scope.presences = _.map(
                        _.uniqBy(currentState, (s) => { return s.clientId.person.email; }),
                        (pr) => {
                            var person = pr.clientId.person;
                            return { indicatorText:
                                (person.firstName.charAt(0) + person.lastName.charAt(0)).toUpperCase(),
                                longText: [person.firstName, person.lastName].join(" "),
                                email: person.email,
                                status: "present" };
                        });
                }
            }

            $scope.$watch(() => wfPresenceInitialData.getForId($scope.id), () => {
                applyCurrentState(wfPresenceInitialData.getForId($scope.id));
            });

            $scope.$on("presence.status", (ev, data) => {
                if($scope.id === data.subscriptionId) {
                    applyCurrentState(data.currentState);
                }
            });
        }
    };
}

export { wfPresenceIndicatorsDirective };
