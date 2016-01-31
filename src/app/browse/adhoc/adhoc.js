angular.module( 'orderCloud' )

    .config( AdHocConfig )
    .factory( 'AdHocService', AdHocService)
    .controller( 'AdHocCtrl', AdHocController )
    .controller( 'AdHocDocumentCtrl', AdHocDocumentController )
    .controller( 'AdHocPosterBannerCtrl', AdHocPosterBannerController )
    .controller( 'AdHocNewDocumentCtrl', AdHocNewDocumentController )
    .filter( 'adhocproducttype', adhocproducttype )

;

function AdHocConfig($stateProvider) {
    $stateProvider
        .state( 'adhoc', {
            parent: 'base',
            url: '/adhoc',
            templateUrl:'browse/adhoc/templates/adhoc.tpl.html',
            controller:'AdHocCtrl',
            controllerAs: 'adhoc',
            resolve: {
                AdHocProducts: function(AdHocService) {
                    return AdHocService.GetAdHocProducts();
                }
            }
        })
        .state( 'adhoc.document', {
            url: '/document/:productID',
            templateUrl: 'browse/adhoc/templates/adhoc.document.tpl.html',
            controller: 'AdHocDocumentCtrl',
            controllerAs: 'adhocDocument',
            resolve: {
                Product: function($stateParams, Products) {
                    return Products.Get($stateParams.productID);
                }
            }
        })
        .state( 'adhoc.posterbanner', {
            url: '/posterbanner/:productID',
            templateUrl: 'browse/adhoc/templates/adhoc.posterbanner.tpl.html',
            controller: 'AdHocPosterBannerCtrl',
            controllerAs: 'adhocPosterBanner',
            resolve: {
                Product: function($stateParams, Products) {
                    return Products.Get($stateParams.productID);
                }
            }
        })
        .state( 'adhoc.newDocument', {
            url: '/new',
            templateUrl: 'browse/adhoc/templates/adhoc.new.document.tpl.html',
            controller: 'AdHocNewDocumentCtrl',
            controllerAs: 'adhocNewDocument'
        })
    ;
}

function AdHocService($q, Me, Products, OrderCloud, Categories, buyerid) {
    return {
        GetAdHocProducts: _getAdHocProducts,
        CreateNew: _createNew
    };

    function _getAdHocProducts() {
        var deferred = $q.defer();

        Me.ListProducts(null, 'AdHoc', 1, 100)
            .then(function(data) {
                deferred.resolve(data.Items);
            });

        return deferred.promise;
    }

    function _createNew(newDocument, currentUser) {
        var deferred = $q.defer();

        var document = {
            "Name": newDocument.Name,
            "Description": newDocument.Description,
            "QuantityMultiplier": 1,
            "ShipWeight": null,
            "Active": true,
            "Type": "Static",
            "InventoryEnabled": false,
            "InventoryNotificationPoint": null,
            "VariantLevelInventory": false,
            "xp": {
                Type: 'Document'
            },
            "AllowOrderExceedInventory": false,
            "DisplayInventory": false
        };

        if (newDocument.xp && newDocument.xp.document && newDocument.xp.document.URL) {
            document.xp.document = newDocument.xp.document;
        }

        OrderCloud.Products.Create(document)
            .then(function(doc) {
                var assignment = {
                    "ProductID": doc.ID,
                    "StandardPriceScheduleID": "AdHocProducts",
                    "UserID": currentUser.ID,
                    "BuyerID": buyerid
                };
                Products.SaveAssignment(assignment)
                    .then(function() {
                        var catAssignment = {
                            "CategoryID": "adhoc",
                            "ProductID": doc.ID
                        };
                        Categories.SaveAssignment(catAssignment)
                            .then(function() {
                                deferred.resolve(doc);
                            });
                    });
            });

        return deferred.promise;
    }
}

function AdHocController(AdHocProducts) {
    var vm = this;
    vm.products = AdHocProducts;
}

function AdHocDocumentController($sce, Product) {
    var vm = this;
    vm.product = Product;
    vm.productPreviewUrl = (vm.product.xp && vm.product.xp.document && vm.product.xp.document.URL) ? $sce.trustAsResourceUrl('https://docs.google.com/gview?url=' + vm.product.xp.document.URL + '&embedded=true') : null;
}

function AdHocPosterBannerController($state, $rootScope, Product, CurrentOrder, OrderCloud) {
    var vm = this;
    vm.product = Product;

    vm.submit = function() {
        CurrentOrder.Get()
            .then(function(order) {
                AddLineItem(order, vm.product);
            })
            .catch(function() {
                OrderCloud.Orders.Create({})
                    .then(function(order) {
                        CurrentOrder.Set(order.ID);
                        AddLineItem(order, vm.product);
                    });
            });
    };

    function AddLineItem(order, product) {
        OrderCloud.LineItems.Create(order.ID,
            {
                ProductID: product.ID,
                Quantity: product.Quantity,
                xp: {
                    Product: {
                        Group: 'AdHoc',
                        Type: 'PosterBanner'
                    }
                }
            }
        ).then(function(lineItem) {
            $rootScope.$broadcast('LineItemAddedToCart', order.ID, lineItem);
            $state.go('cart');
        });
    }
}

function AdHocNewDocumentController($state, $scope, $sce, AdHocService, CurrentUser) {
    var vm = this;

    vm.newDocument = {};
    vm.showUpload = false;

    $scope.$watch(function () {
        if (vm.newDocument.xp && vm.newDocument.xp.document && vm.newDocument.xp.document.URL) {
            vm.preview = true;
            vm.iframeURL = $sce.trustAsResourceUrl('https://docs.google.com/gview?url=' + vm.newDocument.xp.document.URL + '&embedded=true');
        }
        return vm.newDocument.xp;
    },function(value){
        if (vm.newDocument.xp && vm.newDocument.xp.document && vm.newDocument.xp.document.URL) {
            vm.preview = true;
            vm.iframeURL = $sce.trustAsResourceUrl('https://docs.google.com/gview?url=' + vm.newDocument.xp.document.URL + '&embedded=true');
        }
    });

    vm.submit = function() {
        AdHocService.CreateNew(vm.newDocument, CurrentUser)
            .then(function(product) {
                $state.go('adhoc.product', {productID: product.ID})
            });
    };
}

function adhocproducttype() {
    return function(products, type) {
        var results = [];

        angular.forEach(products, function(product) {
            if (product.xp && product.xp.Type && product.xp.Type == type) {
                results.push(product);
            }
        });

        return results;
    }
}
