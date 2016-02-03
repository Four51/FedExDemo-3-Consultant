angular.module( 'orderCloud' )

	.config( BaseConfig )
    .factory('BaseService', BaseService)
	.controller( 'BaseCtrl', BaseController )
    .controller( 'BaseLeftCtrl', BaseLeftController )
    .controller( 'BaseLeftFedExCtrl', BaseLeftFedExController )
    .controller( 'BaseTopCtrl', BaseTopController )

;

function BaseConfig( $stateProvider ) {
	$stateProvider
		.state( 'base', {
			url: '',
			abstract: true,
			templateUrl:'base/templates/base.tpl.html',
            views: {
                '': {
                    templateUrl: 'base/templates/base.tpl.html',
                    controller: 'BaseCtrl',
                    controllerAs: 'base'
                },
                'top@base': {
                    templateUrl: 'base/templates/base.top.tpl.html',
                    controller: 'BaseTopCtrl',
                    controllerAs: 'baseTop'
                },
                /*'left@base': {
                    templateUrl: 'base/templates/base.left.tpl.html',
                    controller: 'BaseLeftCtrl',
                    controllerAs: 'baseLeft'
                }*/
                'left@base': {
                    templateUrl: 'base/templates/base.left.fedex.tpl.html',
                    controller: 'BaseLeftFedExCtrl',
                    controllerAs: 'baseLeft'
                }
            },
            resolve: {
                CurrentUser: function($q, $state, OrderCloud) {
                    var dfd = $q.defer();
                    OrderCloud.Me.Get()
                        .then(function(data) {
                            dfd.resolve(data);
                        })
                        .catch(function(){
                            OrderCloud.Auth.RemoveToken();
                            OrderCloud.Auth.RemoveImpersonationToken();
                            OrderCloud.BuyerID.Set(null);
                            $state.go('login');
                            dfd.resolve();
                        });
                    return dfd.promise;
                },
                ComponentList: function($state, $q, Underscore) {
                    var deferred = $q.defer();
                    var nonSpecific = ['Products', 'Specs', 'Price Schedules', 'Admin Users'];
                    var components = {
                        nonSpecific: [],
                        buyerSpecific: []
                    };
                    angular.forEach($state.get(), function(state) {
                        if (!state.data || !state.data.componentName) return;
                        if (nonSpecific.indexOf(state.data.componentName) > -1) {
                            if (Underscore.findWhere(components.nonSpecific, {Display: state.data.componentName}) == undefined) {
                                components.nonSpecific.push({
                                    Display: state.data.componentName,
                                    StateRef: state.name
                                });
                            }
                        } else {
                            if (Underscore.findWhere(components.buyerSpecific, {Display: state.data.componentName}) == undefined) {
                                components.buyerSpecific.push({
                                    Display: state.data.componentName,
                                    StateRef: state.name
                                });
                            }
                        }
                    });
                    deferred.resolve(components);
                    return deferred.promise;
                },
                CategoryList: function(OrderCloud) {
                    return OrderCloud.Categories.List(null, 'all');
                },
                Order: function($q, CurrentOrder) {
                    var deferred = $q.defer();

                    CurrentOrder.Get()
                        .then(function(o) {
                            deferred.resolve(o)
                        })
                        .catch(function() {
                            deferred.resolve(null);
                        });

                    return deferred.promise;
                }
            }
		});
}

function BaseService($q, OrderCloud) {
    var service = {
        GetRegistrationRequests: _getRegistrationRequests,
        CalculateLineItemMarkups: _calculateLineItemMarkups,
        CalculateTotalMarkup: _calculateTotalMarkup
    };

    function _getRegistrationRequests() {
        var deferred = $q.defer();

        OrderCloud.Users.List(null, 1, 100, null, null, {'xp.TempUser': true})
            .then(function(data) {
                deferred.resolve(data.Items);
            });

        return deferred.promise;
    }

    function _calculateLineItemMarkups(lineItem) {
        var markup = 0;

        if (lineItem.xp && lineItem.xp.CustomizationOptions) {
            angular.forEach(lineItem.xp.CustomizationOptions, function(value, key) {
               if (value.Markup) markup += (value.Markup * lineItem.Quantity * 21); //21 pages in demo document
            });
        }

        return markup;
    }

    function _calculateTotalMarkup(lineItems) {
        var markup = 0;

        angular.forEach(lineItems, function(lineItem) {
            if (lineItem.Markup) {
                markup += lineItem.Markup;
            }
        });

        return markup;
    }

    return service;
}

function BaseController($rootScope, $state, CurrentUser, BaseService, Order) {
	var vm = this;
    vm.currentUser = CurrentUser;
    vm.currentOrder = Order;

    vm.requests = null;
    if (vm.currentUser.xp && vm.currentUser.xp.Admin) {
        BaseService.GetRegistrationRequests()
            .then(function(requests) {
                vm.requests = requests;
            })
    }

    $rootScope.$on('$stateChangeError', function(event, toState, toParams, fromState, fromParams, error) {
        console.log(error);
    });

    vm.goToCategory = function(category) {
        if (category.xp && category.xp.workflow) {
            $state.go(category.xp.workflow)
        }
        else {
            $state.go('print');
        }
    };
}

function BaseLeftController(ComponentList) {
    var vm = this;
    vm.catalogItems = ComponentList.nonSpecific;
    vm.organizationItems = ComponentList.buyerSpecific;
    vm.isCollapsed = true;
}

function BaseTopController() {
    var vm = this;
}

function BaseLeftFedExController(CategoryList) {
    var vm = this;
    vm.categories = CategoryList;
}
