import angular from 'angular';

import _ from 'lodash';
import 'lib/filters-service';

// load and cache html templates
import sidebarFilterTemplate from './sidebar-filter.html';
import './custom-filter-templates/deadline-date-select.html';

angular.module('wfSidebarFilter', ['wfFiltersService'])
    .directive('wfSidebarFilter', ['wfFiltersService', '$injector', '$timeout', 'wfPreferencesService', function (wfFiltersService, $injector, $timeout, wfPreferencesService) {

    return {
        restrict: 'E',
        replace: true,
        template: sidebarFilterTemplate,
        scope: {
            filter: '=wfFilter'
        },
        link: function ($scope, elem, attrs) {

            function isMultiSelect() {
                if(typeof $scope.filter["multi"] === "boolean")
                    return $scope.filter["multi"];
                else
                    return false
            }

            $scope.defaultFilter = { caption: "All", value: null };

            (function setUpSelectedFiltersFromUrl () {

                if ($scope.filter.individualNamespaces) {

                    $scope.selectedFilters = [];

                    $scope.filter.filterOptions.forEach((filterOption) => {
                        let currentSelection = wfFiltersService.get(filterOption.namespace);

                        if (currentSelection) {
                            currentSelection = currentSelection === 'me' ? _wfConfig.user.email : currentSelection;
                            $scope.selectedFilters.push(filterOption.namespace + ':' + currentSelection);
                        }
                    });


                } else {
                    const currentSelection = wfFiltersService.get($scope.filter.namespace);

                    if (!currentSelection) {
                        $scope.selectedFilters = [];
                    } else {
                        $scope.selectedFilters = currentSelection.split(",")
                    }
                }
            })();

            if ($scope.filter.customLinkFunction) { // Custom linking function for non-standard filters
                $injector.invoke(
                    $scope.filter.customLinkFunction, // function
                    this, // scope for execution
                    {
                        '$scope': $scope // local variables to be used before dependency resolution
                    }
                );
            }

            $scope.$on('filters.clearAll', () => {
                $scope.selectedFilters = [];
            });

            $scope.filterIsSelected = function(filter) {
                if ($scope.selectedFilters.length < 1) {
                    return filter.value === $scope.defaultFilter.value
                } else if ($scope.filter.individualNamespaces) {
                    return (filter != null && _.includes($scope.selectedFilters, individualNamespacesFilterName(filter)));
                } else {
                    return (filter != null && _.includes($scope.selectedFilters, filter.value));
                }
            };

            $scope.defaultFilterClick = function(filter) {
                // this is a replace operation, instead of an add
                $scope.selectedFilters = [];

                if ($scope.filter.individualNamespaces) {
                    $scope.filter.filterOptions.forEach((filterOption) => {
                        $scope.$emit('filtersChanged.' + filterOption.namespace, $scope.selectedFilters);
                    });
                } else {
                    $scope.$emit('filtersChanged.' + $scope.filter.namespace, $scope.selectedFilters);
                }
            };

            $scope.selectFilter = function(filter) {

                if(isMultiSelect()) {
                    $scope.selectedFilters.push(filter);
                } else {
                    $scope.selectedFilters = [filter];
                }
            };

            $scope.filterClick = function(filter) {

                if ($scope.filter.individualNamespaces) {

                    const filterName = individualNamespacesFilterName(filter);

                    if($scope.filterIsSelected(filter)) {
                        $scope.selectedFilters =
                            _.filter($scope.selectedFilters,
                                    flt => flt !== filterName);
                        $scope.$emit('filtersChanged.' + filter.namespace, '');
                    } else {

                        $scope.selectFilter(filterName);
                        $scope.$emit('filtersChanged.' + filter.namespace, filter.value);
                    }

                } else {

                    if($scope.filterIsSelected(filter)) {
                        $scope.selectedFilters =
                            _.filter($scope.selectedFilters,
                                    flt => flt !== filter.value);
                    } else {
                        $scope.selectFilter(filter.value);
                    }

                    $scope.$emit('filtersChanged.' + $scope.filter.namespace, $scope.selectedFilters);
                }
            };

            $scope.toggleSidebarSection = function () {

                if ($scope.listIsOpen) {
                    $scope.listIsOpen = false;
                    $scope.list.style.maxHeight = '0px';
                    updatePreference('listIsOpen', false);
                } else {
                    $scope.listIsOpen = true;
                    $scope.list.style.maxHeight = $scope.listHeight + 'px';
                    updatePreference('listIsOpen', true);
                }

            };

            function individualNamespacesFilterName (filter) {
                return filter.namespace + ":" + filter.value;
            }

            /**
             * Update a generic filter preference
             * @param key
             * @param value
             */
            function updatePreference (key, value) {

                $scope.filterPrefs = $scope.filterPrefs
                    .filter((filter) => filter && filter !== null) // TODO: Figure out where nulls in the prefs come from
                    .map((filter) => {
                        if (filter && filter.namespace === $scope.filter.namespace) {
                            filter[key] = value;
                        }
                        return filter;
                    });

                wfPreferencesService
                    .setPreference('filters', $scope.filterPrefs);
            }

            /**
             * After rendering set up the filter list display.
             *  - Request the preference for the display of the filters
             *  - Set the filter preferences locally along with the display data for the filter
             *  - Trigger the render at setUpListDisplay
             */
            $timeout(() => {

                function setUpListDisplay () {
                    $scope.list = $scope.list || elem[0].querySelector('.sidebar__filter-list');

                    if (!$scope.listHeight) {
                        $scope.listHeight = $scope.list.offsetHeight;
                        $scope.list.style.maxHeight = $scope.listHeight + 'px';
                        getComputedStyle($scope.list).maxHeight; // Force reflow in FF & IE
                    }

                    if (!$scope.listIsOpen) {
                        $scope.list.style.maxHeight = '0px';
                    }
                }

                wfPreferencesService
                    .getPreference('filters')
                    .then(function resolve (data) {

                        $scope.filterPrefs = data;
                        const thisFilterPref = data.filter((filter) => filter && filter.namespace === $scope.filter.namespace);

                        if ($scope.selectedFilters.length > 0) { // If this filter has an option selected on load then display it open by default

                            $scope.listIsOpen = true;
                        } else { // Else display the users set preference
                            if (thisFilterPref.length > 0) {

                                $scope.listIsOpen = thisFilterPref[0].listIsOpen;
                            } else { // Else display the default preference

                                $scope.filterPrefs.push({
                                    namespace: $scope.filter.namespace,
                                    listIsOpen: $scope.filter.listIsOpen
                                });
                                $scope.listIsOpen = $scope.filter.listIsOpen;
                            }
                        }

                        setUpListDisplay();
                    }, function reject () {
                        $scope.filterPrefs = [];
                        $scope.filterPrefs.push({
                            namespace: $scope.filter.namespace,
                            listIsOpen: $scope.filter.listIsOpen
                        });
                        $scope.listIsOpen = $scope.filter.listIsOpen;

                        setUpListDisplay();
                    });

            }, 0);
        }
    };

    }]).controller("wfToolbarFreetextController", ['wfFiltersService', '$rootScope', '$scope', '$timeout', function(wfFiltersService, $rootScope, $scope, $timeout) {
        // how long to wait (ms) after seeing a change before
        // committing it? (e.g. we want to activate the change
        // once the user has finished typing).
        const defaultDelay = 500;

        $scope.value = "";
        let timeout = null;
        let oldValue = null;

        $scope.reset = function () {
            $scope.value = "";
            $scope.update(0);
        };

        $scope.update = function(delay) {

            if(arguments.length < 1) {
                delay = defaultDelay;
            }

            if(timeout != null) {
                $timeout.cancel(timeout);
            }

            timeout = $timeout(() => {
                const newValue = ($scope.value.length < 1) ? null :
                    $scope.value;

                $rootScope.$broadcast(
                    "filtersChanged.freeText",
                    {newValue: newValue, oldValue: oldValue}
                );
                oldValue = newValue;
            }, delay);
        }
    }]);
