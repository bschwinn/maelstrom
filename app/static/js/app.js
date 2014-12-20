
window.dateTimeFormatDisplay = 'MM/dd/yy hh:mm:ss'
window.tempFormat = 'F';

// declare app level module and it's dependencies

brewApp = angular.module('brewApp', ['ngRoute', 'brewApp.controllers', 'brewApp.services', 'brewtabs']);
brewApp.config(
    function($routeProvider, $locationProvider) {
      $routeProvider.
      when('/profiles', {
          activeTab: 'profiles'
      }).
      when('/appsettings', {
        activeTab: 'appsettings'
      }).
      when('/controllers', {
        activeTab: 'controllers'
      }).
      when('/debugger', {
        activeTab: 'debugger'
      });
      $locationProvider.html5Mode(false);
});
brewApp.directive('brewKeyProcessor', function() {
	return {
		link: function(scope, el, attrs) {
			$(document).bind( 'keypress', function(e) {
			  if (e.which==108) {
			  	$('#deviceLogs').modal();
			  }
			});
		}
	};
});
brewApp.directive('brewProfileTable', function($filter) {
    return {
        link: function(scope, el, attrs) {
            function formatDateDisplay(d) {
                return $filter('date')(d,window.dateTimeFormatDisplay);
            }
            function updateChart() {
                if ( scope.profileChart !== null && typeof(scope.profileChart) !== 'undefined' ) {
                    scope.profileChart.drawChart( scope.profileEditor.getProfileDuration(), scope.profileEditor.toCSV(true, ['date', 'temperature']) );
                }
            }
            profileEdit = new TemperatureProfileTable( $(el).attr('id'), new Date(), {
                editable: false,
                tableClass: "table table-striped table-hover table-bordered table-condensed",
                displayDateFormatter: formatDateDisplay, chartUpdateCallBack: updateChart,
                contextMenuCssClass: 'profileTableMenu', contextMenuDisplayHandler: null
            });
            scope.setProfileEditor(profileEdit);
        }
    };
});
brewApp.directive('brewProfileChart', function($filter) {
    return {
        link: function(scope, el, attrs) {
            profileChart = new TemperatureProfileChart( $(el).attr('id'), 
                function(d) { 
                    return $filter('date')(d, window.dateTimeFormatDisplay);
                },
                function(y) {
                    return parseFloat(y).toFixed(2) + "\u00B0 " + window.tempFormat;
                }
            );
            scope.setProfileChart(profileChart);
        }
    };
});
brewApp.directive('brewDataSlider', function($timeout) {
    return {
        restrict: 'AE',
        replace: true,
        scope: {
          controllers: '='
        },
        link: function(scope, elem, attrs) {
            // indexing
            scope.currentIndex = 0;
            scope.next = function() {
              scope.currentIndex < scope.controllers.length - 1 ? scope.currentIndex++ : scope.currentIndex = 0;
            };
            scope.prev = function() {
              scope.currentIndex > 0 ? scope.currentIndex-- : scope.currentIndex = scope.controllers.length - 1;
            };            
            scope.$watch('currentIndex', function() {
                if ( scope.controllers.length > 0 ) {
                    scope.controllers.forEach(function(c) { c.brewSliderVisible = false; });
                    scope.controllers[scope.currentIndex].brewSliderVisible = true; // make the current controller's data visible
                }
            });
            scope.$watch('controllers', function() {
                if ( scope.controllers.length > 0 ) {
                    scope.controllers[scope.currentIndex].brewSliderVisible = true; // make the current controller's data visible
                }
            });

            // auto-slide
            var timer;
            var t = 3000;
            var sliderFunc = function() {
              timer = $timeout(function() {
                scope.next();
                timer = $timeout(sliderFunc, t);
              }, t);
            };
            sliderFunc();

            // destroy all the things
            scope.$on('$destroy', function() {
              $timeout.cancel(timer); // when the scope is getting destroyed, cancel the timer
            });
        },
        templateUrl: 's/js/templates/brewDataSlider.html'
    };
});
brewApp.directive('brewDebounce', function($timeout) {
    return {
        restrict: 'A',
        require: 'ngModel',
        priority: 99,
        link: function(scope, elm, attr, ngModelCtrl) {
            if (attr.type === 'radio' || attr.type === 'checkbox') return;

            elm.unbind('input');

            var debounce;
            elm.bind('input', function() {
                $timeout.cancel(debounce);
                debounce = $timeout( function() {
                    scope.$apply(function() {
                        ngModelCtrl.$setViewValue(elm.val());
                    });
                }, attr.ngDebounce || 1000);
            });
            elm.bind('blur', function() {
                scope.$apply(function() {
                    ngModelCtrl.$setViewValue(elm.val());
                });
            });
        }

    }
});
brewApp.directive('brewAutoScroll', function(){ // courtesy of Luegg: https://github.com/Luegg/angularjs-scroll-glue


	function fakeNgModel(initValue){
        return {
            $setViewValue: function(value){
                this.$viewValue = value;
            },
            $viewValue: initValue
        };
    }

    return {
        priority: 1,
        require: ['?ngModel'],
        restrict: 'A',
        link: function(scope, $el, attrs, ctrls){
            var el = $el[0];
            var ngModel = ctrls[0] || fakeNgModel(true);

            function scrollToBottom(){
                el.scrollTop = el.scrollHeight;
            }

            function shouldActivateAutoScroll(){
                // + 1 catches off by one errors in chrome
                return el.scrollTop + el.clientHeight + 1 >= el.scrollHeight;
            }

            scope.$watch(function(){
                if(ngModel.$viewValue){
                    scrollToBottom();
                }
            });

            $el.bind('scroll', function(){
                var activate = shouldActivateAutoScroll();
                if(activate !== ngModel.$viewValue){
                    scope.$apply(ngModel.$setViewValue.bind(ngModel, activate));
                }
            });
        }
    };
});


