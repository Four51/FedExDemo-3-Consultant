angular.module( 'orderCloud' )

    .config( PromotionalConfig )
    .factory( 'PromotionalService', PromotionalService )
    .controller( 'PromotionalCtrl', PromotionalController )
    .controller( 'PromotionalProductCtrl', PromotionalProductController )

;

function PromotionalConfig($stateProvider) {
    $stateProvider
        .state( 'promotionalproducts', {
            parent: 'base',
            url: '/promotional',
            templateUrl:'browse/promotional/templates/promotional.tpl.html',
            controller:'PromotionalCtrl',
            controllerAs: 'promotional',
            resolve: {
                ProductList: function(PromotionalService) {
                    return PromotionalService.GetProducts();
                }
            }
        })
        .state( 'promotionalproducts.product', {
            url: '/:productID',
            templateUrl: 'browse/promotional/templates/promotional.product.tpl.html',
            controller: 'PromotionalProductCtrl',
            controllerAs: 'promotionalProduct',
            resolve: {
                Product: function($stateParams, PromotionalService) {
                    return PromotionalService.GetProductDetails($stateParams.productID);
                }
            }
        })
    ;
}

function PromotionalService($q, Me, Products, Specs, CurrentOrder, OrderCloud, LineItemHelpers) {
    var service = {
        GetProducts: _getProducts,
        GetProductDetails: _getProductDetails,
        AddProductToOrder: _addProductToOrder
    };

    function _getProducts() {
        var deferred = $q.defer();

        Me.ListProducts(null, 'promotionalproducts', 1, 100)
            .then(function(data) {
                deferred.resolve(data.Items);
            });

        return deferred.promise;
    }

    function _getProductDetails(productID) {
        var deferred = $q.defer();
        var product;

        Me.GetProduct(productID)
            .then(function(data) {
                product = data;
                product.Specs = [];
                getSpecAssignments();
            });

        function getSpecAssignments() {
            Specs.ListProductAssignments(null, product.ID, 1, 100)
                .then(function(data) {
                    getSpecs(data.Items);
                });
        }

        function getSpecs(items) {
            var queue = [];

            angular.forEach(items, function(a) {
                queue.push((function() {
                    var d = $q.defer();

                    Specs.Get(a.SpecID)
                        .then(function(spec) {
                            if (spec.DefaultValue) spec.Value = spec.DefaultValue;
                            if (spec.DefaultOptionID) spec.OptionID = spec.DefaultOptionID;
                            product.Specs.push(spec);
                            d.resolve();
                        });

                    return d.promise;
                })());
            });

            $q.all(queue).then(function() {
                getInventory();
            });
        }

        function getInventory() {
            Products.GetInventory(product.ID)
                .then(function(inventory) {
                    product.Inventory = inventory;
                    deferred.resolve(product);
                });
        }

        return deferred.promise;
    }

    function _addProductToOrder(product) {
        var deferred = $q.defer();

        CurrentOrder.Get()
            .then(function(order) {
                AddLineItem(order);
            })
            .catch(function() {
                OrderCloud.Orders.Create({})
                    .then(function(order) {
                        CurrentOrder.Set(order.ID);
                        AddLineItem(order);
                    });
            });

        function AddLineItem(order) {
            var lineItem = {
                ProductID: product.ID,
                Quantity: product.Quantity,
                Specs: LineItemHelpers.SpecConvert(product.Specs),
                xp: {
                    Product: {
                        Group: 'Documents',
                        Type: 'Document'
                    }
                }
            };
            OrderCloud.LineItems.Create(order.ID, lineItem)
                .then(function(lineItem) {
                    deferred.resolve(lineItem);
                });
        }

        return deferred.promise;
    }

    return service;
}

function PromotionalController(PromotionalService, ProductList) {
    var vm = this;
    vm.products = ProductList;
}

function PromotionalProductController($state, $rootScope, $scope, Product, PromotionalService) {
    var vm = this;
    vm.product = Product;

    vm.price = null;

    $scope.$watch(function() {
        return vm.product.Quantity;
    }, function(newValue, oldValue) {
        if (newValue && newValue !== oldValue) {
            var max_quantity = 0;
            angular.forEach(vm.product.StandardPriceSchedule.PriceBreaks, function(PriceBreaks) {
                if (vm.product.Quantity >= PriceBreaks.Quantity && PriceBreaks.Quantity > max_quantity) {
                    max_quantity = PriceBreaks.Quantity;
                    vm.price = PriceBreaks.Price * vm.product.Quantity;
                }
                else return null;
            });
        }
        else if (!newValue) {
            vm.price = null;
        }
    });

    vm.submit = function() {
        PromotionalService.AddProductToOrder(vm.product)
            .then(function() {
                $rootScope.$broadcast('LineItemAddedToCart');
                $state.go('cart');
            });
    };
}