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

function AdHocService($q, Me, Products, OrderCloud, Categories, CurrentOrder, buyerid) {
    return {
        GetAdHocProducts: _getAdHocProducts,
        CreateNewDocument: _createNewDocument,
        AddDocumentToOrder: _addDocumentToOrder,
        AddPosterBannerToOrder: _addPosterBannerToOrder
    };

    function _getAdHocProducts() {
        var deferred = $q.defer();

        Me.ListProducts(null, 'AdHoc', 1, 100)
            .then(function(data) {
                deferred.resolve(data.Items);
            });

        return deferred.promise;
    }

    function _createNewDocument(newDocument, currentUser) {
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

    function _addDocumentToOrder(product, customizationOptions) {
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
                Quantity: 1,
                xp: {
                    Product: {
                        Group: 'AdHoc',
                        Type: 'Document'
                    },
                    CustomizationOptions: customizationOptions
                }
            };
            OrderCloud.LineItems.Create(order.ID, lineItem)
                .then(function(lineItem) {
                    deferred.resolve(lineItem);
                });
        }

        return deferred.promise;
    }

    function _addPosterBannerToOrder(product) {
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
                xp: {
                    Product: {
                        Group: 'AdHoc',
                        Type: 'PosterBanner'
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
}

function AdHocController(AdHocProducts) {
    var vm = this;
    vm.products = AdHocProducts;
}

function AdHocDocumentController($sce, $state, Product, AdHocService) {
    var vm = this;
    vm.product = Product;
    vm.productPreviewUrl = (vm.product.xp && vm.product.xp.document && vm.product.xp.document.URL) ? $sce.trustAsResourceUrl('https://docs.google.com/gview?url=' + vm.product.xp.document.URL + '&embedded=true') : null;

    vm.binding = ['None', 'Staple', 'Coil Binding & Covers', 'Comb Binding & Covers', 'Binder & Spine'];
    vm.stapleOptions = ['Top Left Staples', 'Top Double Stapled', 'Side Double Stapled'];
    vm.binderColors = ['Black', 'White'];
    vm.binderSizes = ['Half Inch', 'One Inch', 'One and One Half Inch', 'Two Inches', 'Three Inches'];
    vm.paperColors = ['Ultra Bright White', 'Gloss Cover', 'Ivory', 'Canary', 'Pastel Blue', 'Green', 'Red', 'Sun Yellow'];

    vm.customizationOptions = {};

    vm.submit = function() {
        AdHocService.AddDocumentToOrder(vm.product, vm.customizationOptions)
            .then(function() {
                $state.go('cart');
            });
    };
}

function AdHocPosterBannerController($state, Product, AdHocService) {
    var vm = this;
    vm.product = Product;

    vm.submit = function() {
        AdHocService.AddPosterBannerToOrder(vm.product)
            .then(function() {
                $state.go('cart')
            });
    };
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
        AdHocService.CreateNewDocument(vm.newDocument, CurrentUser)
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
