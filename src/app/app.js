angular.module( 'orderCloud', [
	'templates-app',
	'ngSanitize',
	'ngAnimate',
	'ngMessages',
	'ngTouch',
    'ui.tree',
	'ui.router',
	'ui.bootstrap',
	'orderCloud.sdk',
	'orderCloud.newsdk',
	'toastr',
    'jcs-autoValidate',
    'ordercloud-infinite-scroll',
	'ordercloud-buyer-select',
    'ordercloud-search',
    'ordercloud-assignment-helpers',
    'ordercloud-paging-helpers',
    'ordercloud-auto-id',
    'ordercloud-current-order',
    'ordercloud-address',
    'ordercloud-lineitems',
    'ui.grid',
    'ui.grid.infiniteScroll'
])

	.run( SetBuyerID )
	.config( Routing )
	.config( ErrorHandling )
	.controller( 'AppCtrl', AppCtrl )
	.constant("appname", "MedicalComplianceConsultingFirm")

	//App Constants used by the OrderCloud SDK
	.constant("ocscope", "FullAccess")
	.constant("clientid", "a2bada54-2875-4332-9561-6be354ca039e")
	.constant("buyerid", "MedicalComplianceConsultingFirm")

	//OrderCloud Base URLs
	.constant("authurl", "https://auth.ordercloud.io/oauth/token")
	.constant("apiurl", "https://api.ordercloud.io")
;

function SetBuyerID( OrderCloud, buyerid ) {
	OrderCloud.BuyerID.Get() ? angular.noop() : OrderCloud.BuyerID.Set(buyerid);
}

function Routing( $urlRouterProvider, $urlMatcherFactoryProvider ) {
	$urlMatcherFactoryProvider.strictMode(false);
	$urlRouterProvider.otherwise( '/home' );
	//$locationProvider.html5Mode(true);
}

function ErrorHandling( $provide ) {
	$provide.decorator('$exceptionHandler', handler);

	function handler( $delegate, $injector ) {
		return function( ex, cause ) {
			$delegate(ex, cause);
			if (ex.data.Errors[0].Message.indexOf('Product not found:') == -1) {
				$injector.get('toastr').error(ex.data ? (ex.data.error || (ex.data.Errors ? ex.data.Errors[0].Message : ex.data)) : ex.message, 'Error');
			}
		};
	}
}

function AppCtrl( $rootScope, $state, appname, OrderCloud ) {
	var vm = this;
	vm.name = appname;
	vm.title = appname;
	vm.showLeftNav = true;

	vm.toggleLeftNav = function() {
		vm.showLeftNav = !vm.showLeftNav;
	};

	vm.logout = function() {
		OrderCloud.Auth.RemoveToken();
		OrderCloud.Auth.RemoveImpersonationToken();
		OrderCloud.BuyerID.Set(null);
		$state.go('login');
	};

	$rootScope.$on('$stateChangeSuccess', function(e, toState) {
		if (toState.data && toState.data.componentName) {
			vm.title = appname + ' - ' + toState.data.componentName
		} else {
			vm.title = appname;
		}
	});
}