
import angular from 'angular';

var URL_CONTACT_FORM = 'http://goo.gl/forms/mbdSNgafLt',
    URL_TROUBLESHOOTING_PAGE = '/troubleshooting',

    RECOVERABLE_ERROR_HIDE_TIMEOUT = 10000;

angular.module('wfErrorDisplay', [])
    .config(['$provide', wfErrorConfig])
    .directive('wfErrorDisplay', [wfErrorDisplayDirectiveFactory]);

/**
 * Config which provides an exception handler decorator for handling errors, and
 * appends error display directive to the page body.
 */
function wfErrorConfig($provide) {
    $provide.decorator('$exceptionHandler', ['$delegate', '$injector', wfErrorExceptionHandlerDecorator]);

    angular.element(document.body).prepend('<wf-error-display></wf-error-display>');
}


/**
 * Decorates Angular's exception handler. Broadcasts an event that can be
 * intercepted by the wfErrorDisplay directive for display.
 */
function wfErrorExceptionHandlerDecorator($delegate, $injector) {

    return function wfErrorExceptionHandler(ex, cause) {
        var $rootScope = $injector.get('$rootScope');
        $rootScope.$broadcast('error.show', { error: ex, cause });
        $delegate(ex, cause);
    };
}


/**
 * Maps error types to friendly messages for display.
 */
var errorMessageData = {
    'SessionError': {
        action: 'Please refresh your browser',
        message: ' – we could not verify your login details. If the problem persists, please see the',
        linkText: 'troubleshooting page',
        linkHref: URL_TROUBLESHOOTING_PAGE
    },
    'TimeoutError': {
        message: 'We could not connect to a Workflow service, please try again later.'
    },
    'Error': {
        message: 'An unexpected error has occurred and has been logged. If the problem persists, please',
        isRecoverable: true,
        linkText: 'send feedback',
        linkHref: URL_CONTACT_FORM
    }
};


var wfErrorDisplayTemplate = '<b ng-if="errorData.action">{{ errorData.action }}</b>{{errorData.message}} ' +
    '<a class="error-display__link" target="blank" href="{{errorData.linkHref}}">{{errorData.linkText}}</a>' +
    '<button class="error-display__close" title="Dismiss error" wf-icon="cross" ng-click="ctrl.hideError()"></button>';

/**
 * Directive for displaying the error. Listens for "error.show" and "error.hide" events
 * broadcast from wfErrorExceptionHandler when an error occurs.
 */
function wfErrorDisplayDirectiveFactory() {
    return {
        retrict: 'E',
        scope: true,
        template: wfErrorDisplayTemplate,
        controller: function($scope, $element, $attrs, $timeout) {
            this.showError = (err) => {
                $scope.errorData = err && errorMessageData[err.name] || errorMessageData.Error;
                $attrs.$addClass('error-display--show');

                if ($scope.errorData.isRecoverable) {
                    $timeout(this.hideError, RECOVERABLE_ERROR_HIDE_TIMEOUT);
                } else {
                    $attrs.$addClass('error-display--irrecoverable');
                    $scope.$overlayElem.addClass('error-display-overlay--show');
                }
            };

            this.hideError = () => {
                $attrs.$removeClass('error-display--show');
                $attrs.$removeClass('error-display--irrecoverable');
                $scope.$overlayElem.removeClass('error-display-overlay--show');
            };

            $scope.$on('error.show', ($event, errorDetails) => {
                this.showError(errorDetails.error);
            });

            $scope.$on('error.clear', ($event, errorDetails) => {
                this.hideError();
            });
        },
        controllerAs: 'ctrl',

        link: function($scope, $elem, $attrs) {
            $attrs.$addClass('error-display');

            $scope.$overlayElem = angular.element('<div class="error-display-overlay"></div>');
            $elem.after($scope.$overlayElem);
        }
    };
}