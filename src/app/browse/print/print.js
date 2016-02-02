angular.module( 'orderCloud' )

    .config( PrintConfig )
    .controller( 'PrintCtrl', PrintController )
    .controller( 'PrintOptionsCtrl', PrintOptionsController )

;

function PrintConfig($stateProvider) {
    $stateProvider
        .state( 'print', {
            parent: 'base',
            url: '/print',
            templateUrl:'browse/print/templates/print.tpl.html',
            controller:'PrintCtrl',
            controllerAs: 'print'
        })
        /*.state( 'print.options', {
            url: '/options/:productID',
            templateUrl: 'browse/print/templates/print.options.tpl.html',
            controller: 'PrintOptionsCtrl',
            controllerAs: 'printOptions',
            resolve: {
                Product: function($stateParams, Products) {
                    return Products.Get($stateParams.productID);
                }
            }
        })*/
    ;
}

function PrintController($scope, $state, DocumentsService, CurrentUser) {
    var vm = this;
    vm.newDocument = {};

    vm.uploading = false;
    $scope.$watch(function () {
        if (vm.newDocument.xp && vm.newDocument.xp.document && vm.newDocument.xp.document.URL && !vm.uploading) {
            vm.uploading = true;
            DocumentsService.CreateNewDocument(vm.newDocument, CurrentUser, 'print')
                .then(function(productID) {
                    $state.go('workbooks.workbook', {productID: productID})
                });
        }
        return vm.newDocument.xp;
    },function(value){
        if (vm.newDocument.xp && vm.newDocument.xp.document && vm.newDocument.xp.document.URL && !vm.uploading) {
            vm.uploading = true;
            DocumentsService.CreateNewDocument(vm.newDocument, CurrentUser, 'print')
                .then(function(productID) {
                    $state.go('workbooks.workbook', {productID: productID})
                });
        }
    });

    vm.uploadDocument = function() {
        $("#uploadbutton input").click();
    };
}

function PrintOptionsController(Product) {
    var vm = this;
    vm.product = Product;
}