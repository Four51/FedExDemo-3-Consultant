angular.module('orderCloud')

    .config(CartConfig)
    .controller('CartCtrl', CartController)
    .controller('MiniCartCtrl', MiniCartController)
    .directive('ordercloudMinicart', OrderCloudMiniCartDirective)

;

function CartConfig($stateProvider) {
    $stateProvider
        .state('cart', {
            parent: 'base',
            data: {componentName: 'Cart'},
            url: '/cart',
            templateUrl: 'cart/templates/cart.tpl.html',
            controller: 'CartCtrl',
            controllerAs: 'cart',
            resolve: {
                Order: function($q, $state, toastr, CurrentOrder) {
                    var dfd = $q.defer();
                    CurrentOrder.Get()
                        .then(function(order) {
                            dfd.resolve(order)
                        })
                        .catch(function() {
                            //toastr.error('You do not have an active open order.', 'Error');
                            if ($state.current.name === 'cart') {
                                $state.go('home');
                            }
                            dfd.reject();
                        });
                    return dfd.promise;
                },
                LineItemsList: function($q, $state, Order, Underscore, OrderCloud, toastr, LineItemHelpers) {
                    var dfd = $q.defer();
                    OrderCloud.LineItems.Get(Order.ID)
                        .then(function(data) {
                            if (!data.Items.length) {
                                toastr.error("Your order does not contain any line items.", 'Error');
                                if ($state.current.name === 'cart') {
                                    $state.go('home');
                                }
                                dfd.reject();
                            }
                            else {
                                LineItemHelpers.GetProductInfo(data.Items)
                                    .then(function() {
                                        dfd.resolve(data);
                                    });
                            }
                        })
                        .catch(function() {
                            toastr.error("Your order does not contain any line items.", 'Error');
                            dfd.reject();
                        });
                    return dfd.promise;
                }
            }
        });
}

function CartController($q, $rootScope, OrderCloud, Order, BaseService, LineItemsList, LineItemHelpers) {
    var vm = this;
    vm.order = Order;
    vm.lineItems = LineItemsList;
    vm.removeItem = LineItemHelpers.RemoveItem;
    vm.updateQuantity = LineItemHelpers.UpdateQuantity;
    vm.pagingfunction = PagingFunction;

    angular.forEach(vm.lineItems.Items, function(lineItem) {
        lineItem.Markup = BaseService.CalculateLineItemMarkups(lineItem);
    });

    vm.order.Markup = BaseService.CalculateTotalMarkup(vm.lineItems.Items);

    function PagingFunction() {
        var dfd = $q.defer();
        if (vm.lineItems.Meta.Page < vm.lineItems.Meta.TotalPages) {
            OrderCloud.LineItems.List(vm.order.ID, vm.lineItems.Meta.Page + 1, vm.lineItems.Meta.PageSize)
                .then(function(data) {
                    vm.lineItems.Meta = data.Meta;
                    vm.lineItems.Items = [].concat(vm.lineItems.Items, data.Items);
                    LineItemHelpers.GetProductInfo(vm.lineItems.Items)
                        .then(function() {
                            dfd.resolve(vm.lineItems);
                        });
                });
        }
        else dfd.reject();
        return dfd.promise;
    }

    $rootScope.$on('OC:UpdateOrder', function(event, OrderID) {
        OrderCloud.Orders.Get(OrderID)
            .then(function(data) {
                vm.order = data;
            });
    });
}

function MiniCartController($q, $rootScope, OrderCloud, LineItemHelpers, BaseService, CurrentOrder) {
    var vm = this;
    vm.LineItems = {};
    vm.Order = null;
    vm.showLineItems = false;

    CurrentOrder.Get()
        .then(function(data) {
            vm.Order = data;
            if (data) getLineItems(data);
        })
        .catch(function() {
            vm.Order = null;
        });

    function getLineItems(order) {
        var dfd = $q.defer();
        var queue = [];
        OrderCloud.LineItems.List(order.ID)
            .then(function(li) {
                vm.LineItems = li;
                if (li.Meta.TotalPages > li.Meta.Page) {
                    var page = li.Meta.Page;
                    while (page < li.Meta.TotalPages) {
                        page += 1;
                        queue.push(OrderCloud.LineItems.List(order.ID, page));
                    }
                }
                $q.all(queue)
                    .then(function(results) {
                        angular.forEach(results, function(result) {
                            vm.LineItems.Items = [].concat(vm.LineItems.Items, result.Items);
                            vm.LineItems.Meta = result.Meta;
                        });
                        angular.forEach(vm.LineItems.Items, function(lineItem) {
                            lineItem.Markup = BaseService.CalculateLineItemMarkups(lineItem);
                        });
                        vm.Order.Markup = BaseService.CalculateTotalMarkup(vm.LineItems.Items);
                        dfd.resolve(LineItemHelpers.GetProductInfo(vm.LineItems.Items.reverse()));
                    });
            });
        return dfd.promise;
    }

    $rootScope.$on('LineItemAddedToCart', function() {
        CurrentOrder.Get()
            .then(function(order) {
                getLineItems(order);
                vm.showLineItems = false;
            });
    });

    $rootScope.$on('LineItemDelete', function() {
        CurrentOrder.Get()
            .then(function(order) {
                getLineItems(order);
            })
            .catch(function() {
                vm.Order = null;
                vm.LineItems = null;
            })
    });

    $rootScope.$on('RemoveMiniCartOrder', function() {
        vm.Order = null;
        vm.LineItems = null
    });
}

function OrderCloudMiniCartDirective() {
    return {
        restrict: 'E',
        scope: {},
        templateUrl: 'cart/templates/minicart.tpl.html',
        controller: 'MiniCartCtrl',
        controllerAs: 'minicart'
    };
}
