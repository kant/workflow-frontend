
/**
 * Module which exposes a directive outputting a Date picker form field.
 *
 * To show just a date picker field:
 *   <div wf-date-time-picker ng-model="stub.due"/>
 *
 * To show date picker field with a label:
 *  <div wf-date-time-picker label="Due date" ng-model="stub.due"/>
 *
 * To show date picker field with a label and help text:
 *   <div wf-date-time-picker label="Due something" help-text="true" ng-model="stub.due"/>
 *
 * To show date picker field with a label and custom help text:
 *   <div wf-date-time-picker label="Due something" help-text="custom help text" ng-model="stub.due"/>
 */

import angular from 'angular';
import 'angular-bootstrap-datetimepicker';
import 'angular-bootstrap-datetimepicker/src/css/datetimepicker.css!';
import moment from 'moment';
import 'sugar';

import './date-time-picker.css!';


angular.module('wfDateTimePicker', ['ui.bootstrap.datetimepicker'])

  .filter('wfDateTimePicker.formatDateTime', function() {
    return function(date, format) {
      if (!date || date === '') { return ''; }

      if (format == 'full') {
        format = 'dddd D MMM YYYY, HH:mm';
      } else {
        format = 'D MMM YYYY HH:mm';
      }

      return moment(date).format(format);
    };
  })

  .directive('wfDateTimePicker', ['wfDateTimePicker.formatDateTimeFilter', '$log', function(formatDateTime, $log) {

    var pickerCount = 0;

    return {
      restrict: 'A',
      require: ['ngModel'],
      scope: {
        dateValue: '=ngModel',
        onDatePicked: '=',
        dateFormat: '@wfDateFormat',
        label: '@',
        helpText: '@',
        small: '@wfSmall',
        updateOn: '@wfUpdateOn',
        cancelOn: '@wfCancelOn',
        onCancel: '&wfOnCancel',
        onUpdate: '&wfOnUpdate'
      },
      templateUrl: '/assets/components/date-time-picker/date-time-picker.html',

      controller: function($scope, $element, $attrs) {
        var idSuffix = pickerCount++;

        this.textInputId = 'wfDateTimePickerText' + idSuffix;
        this.dropDownButtonId = 'wfDateTimePickerButton' + idSuffix;
      },
      controllerAs: 'dateTimePicker'
    };
  }])

  .directive('wfDateTimeField', ['wfDateTimePicker.formatDateTimeFilter', '$browser', '$log', function(formatDateTimeFilter, $browser, $log) {

    // Utility methods
    function isArrowKey(keyCode) {
      return 37 <= keyCode && keyCode <= 40;
    }

    function isModifierKey(keyCode) {
      return 15 < keyCode && keyCode < 19;
    }

    // Constants
    var KEYCODE_COMMAND = 91;
    var KEYCODE_ESCAPE = 27;

    return {
      require: '^ngModel',
      scope: {
        textValue: '=ngModel',
        updateOn: '@wfUpdateOn',
        cancelOn: '@wfCancelOn',
        onCancel: '&wfOnCancel',
        onUpdate: '&wfOnUpdate'
      },

      link: function(scope, elem, attrs, ngModel) {

        var updateOn = scope.updateOn || 'default';

        function commitUpdate() {
          scope.$apply(function() {
            ngModel.$setViewValue(elem.val());
          });
        }

        function cancelUpdate() {
          scope.$apply(function() {
            if (hasChanged()) { // reset to model value
              ngModel.$setViewValue(formatDateTimeFilter(ngModel.$modelValue));
              ngModel.$render();
            }

            scope.onCancel();
          });
        }

        function parseDate(value) {
          Date.setLocale('en-UK');

          try {
            // Uses sugar.js Date.create to parse natural date language, ie: "today"
            var due = moment(Date.create(value));

            if (due.isValid()) {
              return moment(due).toDate();
            }

            // TODO: setInvalid when invalid date specified. How do we handle errors?
          }
          catch (err) {
            $log.error('Error parsing date: ', err);
          }
        }

        function hasChanged() {
          return !moment(ngModel.$modelValue).isSame(parseDate(elem.val()));
        }


        // Setup input handlers
        // Slightly hacky, but it works..
        angular.element(elem[0].form).on('submit', commitUpdate);

        // Set event handlers on the input element
        elem.off('input keydown change'); // reset default angular input event handlers
        elem.on('input keydown change blur', function(ev) {
          var key = ev.keyCode,
              type = ev.type;

          if (type == 'keydown' && updateOn == 'default') {

            // ignore the following keys on input
            if ((key === KEYCODE_COMMAND) || isModifierKey(key) || isArrowKey(key)) { return; }

            $browser.defer(commitUpdate);
          }

          if (type == 'blur' && scope.cancelOn == 'blur') {
            cancelUpdate();
          }

          // cancel via escape
          if (type == 'keydown' && key == KEYCODE_ESCAPE) {
            cancelUpdate();
          }
        });

        ngModel.$render = function() {
          elem.val(ngModel.$viewValue || '');
        };

        ngModel.$parsers.push(parseDate);

        ngModel.$formatters.push(formatDateTimeFilter);

        ngModel.$viewChangeListeners.push(function() {
          scope.onUpdate(ngModel.$modelValue);
        });
      }
    };
  }]);
