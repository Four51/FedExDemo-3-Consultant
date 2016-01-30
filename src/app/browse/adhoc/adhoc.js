angular.module( 'orderCloud' )

    .config( AdHocConfig )
    .controller( 'AdHocCtrl', AdHocController )

;

function AdHocConfig($stateProvider) {
    $stateProvider
        .state( 'AdHoc', {
            parent: 'base',
            url: '/adhoc',
            templateUrl:'browse/adhoc/templates/adhoc.tpl.html',
            controller:'AdHocCtrl',
            controllerAs: 'adhoc',
            data: {componentName: 'Ad Hoc'}
        })
    ;
}

function AdHocController() {
    var vm = this;

}