/**
 * Directive for handling logic around the contentItemRow details drawer.
 *
 * Allows the drawer to be shown and hidden in the appropriate places aswell as allowing the editing of some fields.
 *
 * TODO: Try and move away from $timeouts to trigger scope update
 *
 * @param $rootScope
 * @param config
 * @param $timeout
 * @param contentService
 * @param prodOfficeService
 */
var wfContentListDrawer = function ($rootScope, config, $timeout, $log, $window, contentService, prodOfficeService) {

    var transitionEndEvents = 'transitionend webkitTransitionEnd oTransitionEnd otransitionend MSTransitionEnd',
        hiddenClass = 'content-list-drawer--hidden';

    return {
        restrict: 'A',
        replace: true,
        templateUrl: '/assets/components/content-list-drawer/content-list-drawer.html',
        priority: 1001,
        scope: {
            contentList: '=',
            legalValues: '=',
            statusValues: '='
        },
        controllerAs: 'contentListDrawerController',
        controller: function ($scope, $element) {

            /**
             * Hide the drawer from view using css3 transition and remove the selected class form the row.
             * Accessible on $scope for use on 'hide' button in drawer
             */
            this.hide = function () {
                $element.one(transitionEndEvents,() => {
                    $scope.contentList.selectedItem = null;
                    $scope.$apply();
                });
                $element.addClass(hiddenClass);
            };
        },
        link: function ($scope, elem, attrs, contentListDrawerController) {

            var $parent = elem.parent(); // Store parent location for holding unbound elem

            $scope.prodOffices = prodOfficeService.getProdOffices();

            /**
             * Show the content details drawer after moving it to a new position,
             * use a timeout to allow the browser to reflow styles ensuring
             * that the css animation triggers.
             *
             * @param {Object} contentItem
             * @param {Object} contentListItemElement - JQL wrapped DOM node
             */
            function show (contentItem, contentListItemElement) {
                contentListItemElement.after(elem);

                $scope.contentItem = contentItem;
                $scope.contentList.selectedItem = contentItem;

                var w = $window.getComputedStyle(elem[0], null).width; // force reflow styles

                elem.removeClass(hiddenClass);
            }

            /**
             * Listen for event triggered by click in external contentItemRow directive to show or hide drawer
             */
            $rootScope.$on('contentItem.select', ($event, contentItem, contentListItemElement) => {
                $scope.deleteConfirmed = false;

                if (contentItem.status === 'Stub') {
                    $scope.$emit('stub:edit', contentItem.item);
                    return;
                }

                if ($scope.contentList.selectedItem !== contentItem) { // open
                    if (!elem.hasClass(hiddenClass)) {
                        elem.addClass(hiddenClass);
                        elem.one(transitionEndEvents, () => {
                            show(contentItem, contentListItemElement);
                        });
                    } else {
                        show(contentItem, contentListItemElement);
                    }
                } else { // close
                    contentListDrawerController.hide();
                }
            });

            /**
             * Ensure the drawer state is representative if a contentItem changes status
             */
            $rootScope.$on('contentItem.update', ($event, eventData) => {

                if (eventData.contentItem === $scope.contentItem && eventData.data.hasOwnProperty('status')) {

                    // Move element out of ng-repeat list so it doesn't get removed and unbound
                    elem.addClass(hiddenClass);
                    $parent.append(elem);

                    $timeout(() => { // Reset local state on next digest cycle
                        $scope.contentItem = null;
                        $scope.contentList.selectedItem = null;
                    }, 1);
                }
            });

            /**
             * Send event to the contentList controller and analytics to persist and record
             * scope changed value from non-standard scope updates (ng xeditable and datepicker...)
             *
             * TODO: Don't do this...
             * @param {String} field field to be updated
             * @param {String} value new value to be persisted
             * @param {String} oldValue old value to be recorded
             */
            function updateField (field, value, oldValue) { // Send to analytics

                var msg = {
                    contentItem: $scope.contentItem,
                    data: {},
                    oldValues: {}
                };

                msg.data[field] = value;
                msg.oldValues[field] = oldValue;

                $scope.$emit('contentItem.update', msg);
            }

            $scope.onBeforeSaveNote = function (note) {

                if (note.length > config.maxNoteLength) {
                    return "Note too long";
                } else {
                    updateField("note", note, $scope.contentItem.note);
                }
            };

            $scope.onBeforeSaveAssignee = function (assignee) {

                updateField("assignee", assignee, $scope.contentItem.item.assignee);
            };

            $scope.onBeforeSaveWorkingTitle = function (workingTitle) {
                updateField("workingTitle", workingTitle, $scope.contentItem.workingTitle);
            };

            /**
             * Update the deadline manually using value from datepicker
             */
            $scope.updateDeadline = function () {

                var content = $scope.contentItem,
                    parsedDate,
                    requestData;

                if (content.item.due) { // TODO: See content-list.js:118
                    parsedDate = moment(content.item.due);
                    if (parsedDate.isValid()) {
                        requestData = parsedDate.toISOString();
                    }
                }

                updateField("dueDate", requestData);
                $scope.$apply();
            };

            /**
             * Delete manually as no event or tracking yet
             */
            $scope.deleteConfirmed = false;
            $scope.deleteContentItem = function () {
                if(!$scope.deleteConfirmed) { $scope.deleteConfirmed = true; return; } 

                contentService.remove($scope.contentItem.id)
                    .then(() => {

                        // Hide drawer and put it back under $parent so bindings remain
                        elem.addClass(hiddenClass);
                        $parent.append(elem);

                        $scope.$emit('content.deleted', { contentItem: $scope.contentItem });
                        $scope.$apply();
                    }, errorMessage);
            };

            function errorMessage(err) {
                $log.error('Error deleting content: ' + err.message || err);
            }

        }
    };
};

export { wfContentListDrawer };
