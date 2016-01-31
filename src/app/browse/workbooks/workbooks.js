angular.module( 'orderCloud' )

    .config( WorkbooksConfig )
    .factory( 'WorkbooksService', WorkbooksService )
    .controller( 'WorkbooksCtrl', WorkbooksController )
    .controller( 'WorkbooksDocumentCtrl', WorkbooksDocumentController )
    .controller( 'WorkbooksPosterBannerCtrl', WorkbooksPosterBannerController )
    .controller( 'WorkbooksNewDocumentCtrl', WorkbooksNewDocumentController )
    .filter( 'workbookproducttype', workbookproducttype )

;

function WorkbooksConfig($stateProvider) {
    $stateProvider
        .state( 'workbooks', {
            parent: 'base',
            url: '/workbooks',
            templateUrl:'browse/workbooks/templates/workbooks.tpl.html',
            controller:'WorkbooksCtrl',
            controllerAs: 'workbooks',
            resolve: {
                ProductList: function(WorkbooksService) {
                    return WorkbooksService.GetProducts();
                }
            }
        })
        .state( 'workbooks.workbook', {
            url: '/workbook/:productID',
            templateUrl: 'browse/workbooks/templates/workbooks.workbook.tpl.html',
            controller: 'WorkbooksDocumentCtrl',
            controllerAs: 'workbooksDocument',
            resolve: {
                Product: function($stateParams, Products) {
                    return Products.Get($stateParams.productID);
                }
            }
        })
        .state( 'workbooks.posterbanner', {
            url: '/posterbanner/:productID',
            templateUrl: 'browse/workbooks/templates/workbooks.posterbanner.tpl.html',
            controller: 'WorkbooksPosterBannerCtrl',
            controllerAs: 'workbooksPosterBanner',
            resolve: {
                Product: function($stateParams, Products) {
                    return Products.Get($stateParams.productID);
                }
            }
        })
        .state( 'workbooks.newWorkbook', {
            url: '/new',
            templateUrl: 'browse/workbooks/templates/workbooks.new.workbook.tpl.html',
            controller: 'WorkbooksNewDocumentCtrl',
            controllerAs: 'workbooksNewDocument'
        })
    ;
}

function WorkbooksService($q, Me, OrderCloud, Products, Categories, CurrentOrder, buyerid) {
    var service = {
        GetProducts: _getProducts,
        CreateNewWorkbook: _createNewWorkbook,
        AddWorkbookToOrder: _addWorkbookToOrder,
        AddPosterBannerToOrder: _addPosterBannerToOrder
    };

    function _getProducts() {
        var deferred = $q.defer();

        Me.ListProducts(null, 'workbooks', 1, 100)
            .then(function(data) {
                deferred.resolve(data.Items);
            });

        return deferred.promise;
    }

    function _createNewWorkbook(newWorkbook, currentUser) {
        var deferred = $q.defer();

        var workbook = {
            "Name": newWorkbook.Name,
            "Description": newWorkbook.Description,
            "QuantityMultiplier": 1,
            "ShipWeight": null,
            "Active": true,
            "Type": "Static",
            "InventoryEnabled": false,
            "InventoryNotificationPoint": null,
            "VariantLevelInventory": false,
            "xp": {
                Type: 'Workbook'
            },
            "AllowOrderExceedInventory": false,
            "DisplayInventory": false
        };

        if (newWorkbook.xp && newWorkbook.xp.document && newWorkbook.xp.document.URL) {
            workbook.xp.document = newWorkbook.xp.document;
        }

        if (newWorkbook.xp && newWorkbook.xp.image && newWorkbook.xp.image.URL) {
            workbook.xp.image = newWorkbook.xp.image;
        }

        OrderCloud.Products.Create(workbook)
            .then(function(w) {
                assignProduct(w.ID);
            })
            .catch(function(ex) {
                if (ex.data && ex.data.Errors && ex.data.Errors.length) {
                    var productID = ex.data.Errors[0].Message.replace('Product not found: ', '');
                    assignProduct(productID);
                }
            });

        function assignProduct(productID) {
            var assignment = {
                "ProductID": productID,
                "StandardPriceScheduleID": "WorkbooksProducts",
                "UserID": currentUser.ID,
                "BuyerID": buyerid
            };
            Products.SaveAssignment(assignment)
                .then(function() {
                    var catAssignment = {
                        "CategoryID": "workbooks",
                        "ProductID": productID
                    };
                    Categories.SaveProductAssignment(catAssignment)
                        .then(function() {
                            deferred.resolve(productID);
                        });
                });
        }

        return deferred.promise;
    }

    function _addWorkbookToOrder(product, customizationOptions) {
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
                        Group: 'Workbook',
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
                        Group: 'Workbooks',
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

    return service;
}

function WorkbooksController(ProductList) {
    var vm = this;
    vm.products = ProductList;

    vm.browseDropbox = function() {

    };
}

function WorkbooksDocumentController($sce, $state, Product, WorkbooksService) {
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
        WorkbooksService.AddWorkbookToOrder(vm.product, vm.customizationOptions)
            .then(function() {
                $state.go('cart');
            });
    };
}

function WorkbooksPosterBannerController($state, WorkbooksService, Product) {
    var vm = this;
    vm.product = Product;

    vm.submit = function() {
        WorkbooksService.AddPosterBannerToOrder(vm.product)
            .then(function() {
                $state.go('cart')
            });
    };
}

function WorkbooksNewDocumentController($state, $scope, $sce, WorkbooksService, CurrentUser) {
    var vm = this;

    vm.newWorkbook = {};
    vm.showUpload = false;

    $scope.$watch(function () {
        if (vm.newWorkbook.xp && vm.newWorkbook.xp.document && vm.newWorkbook.xp.document.URL) {
            vm.preview = true;
            vm.iframeURL = $sce.trustAsResourceUrl('https://docs.google.com/gview?url=' + vm.newWorkbook.xp.document.URL + '&embedded=true');
        }
        return vm.newWorkbook.xp;
    },function(value){
        if (vm.newWorkbook.xp && vm.newWorkbook.xp.document && vm.newWorkbook.xp.document.URL) {
            vm.preview = true;
            vm.iframeURL = $sce.trustAsResourceUrl('https://docs.google.com/gview?url=' + vm.newWorkbook.xp.document.URL + '&embedded=true');
        }
    });

    vm.submit = function() {
        WorkbooksService.CreateNewWorkbook(vm.newWorkbook, CurrentUser)
            .then(function(productID) {
                $state.go('workbooks.workbook', {productID: productID})
            });
    };
}

function workbookproducttype() {
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