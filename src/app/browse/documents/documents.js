angular.module( 'orderCloud' )

    .config( DocumentsConfig )
    .factory( 'DocumentsService', DocumentsService)
    .controller( 'DocumentsCtrl', DocumentsController )
    .controller( 'DocumentsDocumentCtrl', DocumentsDocumentController )
    .controller( 'DocumentsNewDocumentCtrl', DocumentsNewDocumentController )

;

function DocumentsConfig($stateProvider) {
    $stateProvider
        .state( 'documents', {
            parent: 'base',
            url: '/documents',
            templateUrl:'browse/documents/templates/documents.tpl.html',
            controller:'DocumentsCtrl',
            controllerAs: 'documents',
            resolve: {
                ProductList: function(DocumentsService) {
                    return DocumentsService.GetProducts();
                }
            }
        })
        .state( 'documents.document', {
            url: '/document/:productID',
            templateUrl: 'browse/documents/templates/documents.document.tpl.html',
            controller: 'DocumentsDocumentCtrl',
            controllerAs: 'documentsDocument',
            resolve: {
                Product: function($stateParams, Products) {
                    return Products.Get($stateParams.productID);
                }
            }
        })
        .state( 'documents.newDocument', {
            url: '/new',
            templateUrl: 'browse/documents/templates/documents.new.document.tpl.html',
            controller: 'DocumentsNewDocumentCtrl',
            controllerAs: 'documentsNewDocument'
        })
    ;
}

function DocumentsService($q, Me, OrderCloud, CurrentOrder, Products, Categories, buyerid) {
    var service = {
        GetProducts: _getProducts,
        AddDocumentToOrder: _addDocumentToOrder,
        CreateNewDocument: _createNewDocument
    };

    function _getProducts() {
        var deferred = $q.defer();

        Me.ListProducts(null, 'documents', 1, 100)
            .then(function(data) {
                deferred.resolve(data.Items);
            });

        return deferred.promise;
    }

    function _addDocumentToOrder(product) {
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

    function _createNewDocument(newDocument, currentUser, type) {
        var deferred = $q.defer();

        var document = {
            "Name": newDocument.Name || type,
            "Description": newDocument.Description,
            "QuantityMultiplier": 1,
            "ShipWeight": null,
            "Active": true,
            "Type": "Static",
            "InventoryEnabled": false,
            "InventoryNotificationPoint": null,
            "VariantLevelInventory": false,
            "xp": {
                Type: type
            },
            "AllowOrderExceedInventory": false,
            "DisplayInventory": false
        };

        if (newDocument.xp && newDocument.xp.document && newDocument.xp.document.URL) {
            document.xp.document = newDocument.xp.document;
        }

        if (newDocument.xp && newDocument.xp.image && newDocument.xp.image.URL) {
            document.xp.image = newDocument.xp.image;
        }

        OrderCloud.Products.Create(document)
            .then(function(d) {
                assignProduct(d.ID);
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
                "StandardPriceScheduleID": "DocumentsProducts",
                "UserID": currentUser.ID,
                "BuyerID": buyerid
            };
            Products.SaveAssignment(assignment)
                .then(function() {
                    var catAssignment = {
                        "CategoryID": (type == 'document' ? 'documents' : (type == 'workbook' ? 'workbooks' : type ? type : 'print')),
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

    return service;
}

function DocumentsController($state, $scope, ProductList, DocumentsService, CurrentUser) {
    var vm = this;
    vm.products = ProductList;

    vm.newDocument = {};

    vm.uploading = false;
    $scope.$watch(function () {
        if (vm.newDocument.xp && vm.newDocument.xp.document && vm.newDocument.xp.document.URL && !vm.uploading) {
            vm.uploading = true;
            DocumentsService.CreateNewDocument(vm.newDocument, CurrentUser, 'document')
                .then(function(productID) {
                    $state.go('workbooks.workbook', {productID: productID})
                });
        }
        return vm.newDocument.xp;
    },function(value){
        if (vm.newDocument.xp && vm.newDocument.xp.document && vm.newDocument.xp.document.URL && !vm.uploading) {
            vm.uploading = true;
            DocumentsService.CreateNewDocument(vm.newDocument, CurrentUser, 'document')
                .then(function(productID) {
                    $state.go('workbooks.workbook', {productID: productID})
                });
        }
    });

    vm.uploadDocument = function() {
        $("#uploadbutton input").click();
    };
}

function DocumentsDocumentController($sce, $state, DocumentsService, Product) {
    var vm = this;
    vm.product = Product;
    vm.productPreviewUrl = (vm.product.xp && vm.product.xp.document && vm.product.xp.document.URL) ? $sce.trustAsResourceUrl('https://docs.google.com/gview?url=' + vm.product.xp.document.URL + '&embedded=true') : null;

    vm.submit = function() {
        DocumentsService.AddDocumentToOrder(vm.product)
            .then(function() {
                $state.go('cart');
            });
    };
}

function DocumentsNewDocumentController($state, $scope, $sce, DocumentsService, CurrentUser) {
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
        DocumentsService.CreateNewDocument(vm.newDocument, CurrentUser, 'document')
            .then(function(product) {
                $state.go('workbooks.workbook', {productID: product.ID})
            });
    };
}