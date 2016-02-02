angular.module( 'orderCloud' )

	.config( HomeConfig )
	.controller( 'HomeCtrl', HomeController )

;

function HomeConfig( $stateProvider ) {
	$stateProvider
		.state( 'home', {
			parent: 'base',
			url: '/home',
			templateUrl: 'home/templates/home.tpl.html',
			controller: 'HomeCtrl',
			controllerAs: 'home'
		})
}

function HomeController($state, CategoryList) {
	var vm = this;
	vm.categories = CategoryList;

	vm.goToCategory = function(category) {
		if (category.xp && category.xp.workflow) {
			$state.go(category.xp.workflow)
		}
		else {
			$state.go('print');
		}
	};
}
