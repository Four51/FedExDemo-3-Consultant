angular.module( 'orderCloud' )

    .config( WorkbooksConfig )
    .controller( 'WorkbooksCtrl', WorkbooksController )

;

function WorkbooksConfig($stateProvider) {
    $stateProvider
        .state( 'Workbooks', {
            parent: 'base',
            url: '/workbooks',
            templateUrl:'browse/workbooks/templates/workbooks.tpl.html',
            controller:'WorkbooksCtrl',
            controllerAs: 'workbooks',
            data: {componentName: 'Workbooks'}
        })
    ;
}

function WorkbooksController() {
    var vm = this;

}