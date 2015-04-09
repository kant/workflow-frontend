import angular from 'angular';
import _ from 'lodash';
import moment  from 'moment';

var quickAddParsers = [
    (item, text) => {
        return text.replace(/article|gallery/i, (match) => {
            item.contentType = match.toLowerCase();
            return match;          // delete the matched text? return "" here if so
        });
    },
    (item, text) => {
        return text.replace(/(@|at )([0-9]+)/i, (match, at, hour) => {
            item.hour = Number(hour);
            return "";
        });
    },
    (item, text) => { item.title = text; return text; }
];

function parseQuickAdd(text) {
    return _.reduce(quickAddParsers, (data, parser) => {
        var newItem = _.clone(data.item);
        var newText = parser(newItem, data.text);
        return {item: newItem, text: newText};
    }, {item: {}, text: text}).item;
}

angular.module('wfQuickAdd', ['wfContentService', 'wfFiltersService'])
    .directive('wfQuickAdd', ['wfContentService', 'wfFiltersService', '$rootScope',  function (wfContent, wfFiltersService, $rootScope) {
       return {
            restrict: 'A',
            templateUrl: '/assets/components/quick-add/quick-add.html',
            scope: {
                customDefaultProps: '=',
                onAddHook: '='
            },
            link: function($scope, elm) {
                $scope.active = false;

                /* the default properties will be applied to the
                 * parsed object, to fill in any gaps */
                var filterParams = wfFiltersService.getAll();
                console.log(filterParams);
                $scope.currentNewsListId = filterParams['news-list'] ? filterParams['news-list'] : null;


                $scope.defaultProps = function(addDate) {
                    return {
                        id: 0,// Should not need to be here!
                        newsList: $scope.currentNewsListId,
                        plannedDate: moment(addDate).format() //.slice(0, 10).replace(/-/g, '-') // yyyy-MM-dd
                    }
                };

                $scope.clearFields = function() {
                    $scope.addText = null;
                    $scope.addDate = null;
                    $rootScope.$broadcast('resetPicker');
                };

                $scope.submit = function () {
                    var parsed = parseQuickAdd($scope.addText);
                    var content = _.defaults(parsed, $scope.defaultProps($scope.addDate));
                    $rootScope.$broadcast("quick-add-submit", content);
                    $scope.clearFields();
                };

                $scope.$on('wf-quick-add-activate', function () {
                    $scope.disabled = false;
                    $scope.active = true;
                });

                $scope.$on('wf-quick-add-deactivate', function () {
                    $scope.disabled = true;
                    $scope.active = false;
                });

                $scope.$on('pvFiltersChanged', function() {
                    var filters = wfFiltersService.getAll();
                    $scope.currentNewsListId = filters['news-list'] ? filters['news-list'] : null;
                });

                // If no news list has been selected ('All news') then disable the quick-add form
                $scope.$watch('currentNewsListId', function() {
                    $scope.disabled = $scope.currentNewsListId ? false : true;
                });
            }
        }
    }])
    .directive('wfQuickAddInput', ['$timeout', function ($timeout) {
        return {
            link: function($scope, elm) {
                // can't listen directly to the event here because
                // there is a race condition with the listener getting
                // activated before focus() is useable.
                $scope.$watch('active', function(newVal, oldVal) {
                    if(newVal != oldVal && newVal == true) elm[0].focus();
                });
            }
        }
    }]);
