// Declare app level module which depends on filters, and services
//var app = angular.module('brewApp', ['brewApp.filters', 'brewApp.directives']);
var app = angular.module('brewApp', []);

window.dateTimeFormatDisplay = 'MM/dd/yy hh:mm:ss'
window.tempFormat = 'F';

app.directive('brewKeyProcessor', function() {
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

app.directive('brewTabs', function() {
	return {
		link: function(scope, el, attrs) {
			$(el).find('a').click(function (e) {
			  e.preventDefault()
			  $(this).tab('show')
			});
			$(el).find('a:first').tab('show');
		}
	};
});

app.directive('brewProfileTable', function($filter) {
    function formatDateDisplay(d) {
        return $filter('date')(d,window.dateTimeFormatDisplay);
    }
    return {
        link: function(scope, el, attrs) {
            profileEdit = new TemperatureProfileTable( $(el).attr('id'), new Date(), {
                editable: false,
                tableClass: "table table-striped table-hover table-bordered table-condensed",
                displayDateFormatter: formatDateDisplay, chartUpdateCallBack: null,
                contextMenuCssClass: 'profileTableMenu', contextMenuDisplayHandler: null
            });
            scope.profileEditor = profileEdit;
        }
    };
});

app.directive('brewProfileChart', function($filter) {
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
            scope.profileChart = profileChart;
        }
    };
});

// courtesy of Luegg: https://github.com/Luegg/angularjs-scroll-glue
app.directive('brewAutoScroll', function(){

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

