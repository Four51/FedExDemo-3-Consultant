angular.module( 'orderCloud' )

    .config( PromotionalConfig )
    .controller( 'PromotionalCtrl', PromotionalController )

;

function PromotionalConfig($stateProvider) {
    $stateProvider
        .state( 'promotionalproducts', {
            parent: 'base',
            url: '/promotional',
            templateUrl:'browse/promotional/templates/promotional.tpl.html',
            controller:'PromotionalCtrl',
            controllerAs: 'promotional',
            data: {componentName: 'Promotional'}
        })
    ;
}

function PromotionalController() {
    var vm = this;

}