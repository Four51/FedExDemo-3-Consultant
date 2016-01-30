angular.module( 'orderCloud' )

    .config( CreditCardsConfig )
    .controller( 'CreditCardsCtrl', CreditCardsController )
    .controller( 'CreditCardEditCtrl', CreditCardEditController )
    .controller( 'CreditCardCreateCtrl', CreditCardCreateController )
    .controller( 'CreditCardAssignCtrl', CreditCardAssignController )

;

function CreditCardsConfig( $stateProvider ) {
    $stateProvider
        .state( 'creditCards', {
            parent: 'base',
            url: '/creditCards',
            templateUrl:'creditCards/templates/creditCards.tpl.html',
            controller:'CreditCardsCtrl',
            controllerAs: 'creditCards',
            data: {componentName: 'Credit Cards'},
            resolve: {
                CreditCardList: function(OrderCloud) {
                    return OrderCloud.CreditCards.List();
                }
            }
        })
        .state( 'creditCards.edit', {
            url: '/:creditCardid/edit',
            templateUrl:'creditCards/templates/creditCardEdit.tpl.html',
            controller:'CreditCardEditCtrl',
            controllerAs: 'creditCardEdit',
            resolve: {
                SelectedCreditCard: function($stateParams, OrderCloud) {
                    return OrderCloud.CreditCards.Get($stateParams.creditCardid);
                }
            }
        })
        .state( 'creditCards.create', {
            url: '/create',
            templateUrl:'creditCards/templates/creditCardCreate.tpl.html',
            controller:'CreditCardCreateCtrl',
            controllerAs: 'creditCardCreate'
        })
        .state( 'creditCards.assign', {
            url: '/:creditCardid/assign',
            templateUrl: 'creditCards/templates/creditCardAssign.tpl.html',
            controller: 'CreditCardAssignCtrl',
            controllerAs: 'creditCardAssign',
            resolve: {
                Buyer: function(OrderCloud) {
                    return OrderCloud.Buyers.Get();
                },
                UserGroupList: function(OrderCloud) {
                    return OrderCloud.UserGroups.List(null, 1, 20);
                },
                AssignedUserGroups: function($stateParams, OrderCloud) {
                    return OrderCloud.CreditCards.ListAssignments($stateParams.creditCardid);
                },
                SelectedCreditCard: function($stateParams, OrderCloud) {
                    return OrderCloud.CreditCards.Get($stateParams.creditCardid);
                }
            }
        })
}

function CreditCardsController( CreditCardList ) {
    var vm = this;
    vm.list = CreditCardList;
}

function CreditCardEditController( $exceptionHandler, $state, OrderCloud, SelectedCreditCard ) {
    var vm = this,
        creditcardid = SelectedCreditCard.ID;
    vm.creditCardName = SelectedCreditCard.ID;
    vm.creditCard = SelectedCreditCard;
    if(vm.creditCard.ExpirationDate != null){
        vm.creditCard.ExpirationDate = new Date(vm.creditCard.ExpirationDate);
    }
    vm.creditCard.Token = "token";

    vm.Submit = function() {
        var expiration = vm.creditCard.ExpirationDate;
        expiration.setMonth(expiration.getMonth() + 1);
        expiration.setDate(expiration.getDate() - 1);
        vm.creditCard.ExpirationDate = expiration;
        OrderCloud.CreditCards.Update(creditcardid, vm.creditCard)
            .then(function() {
                $state.go('creditCards', {}, {reload:true});
            })
            .catch(function(ex) {
                $exceptionHandler(ex);
            });
    };

    vm.Delete = function() {
        OrderCloud.CreditCards.Delete(SelectedCreditCard.ID)
            .then(function() {
                $state.go('creditCards', {}, {reload:true})
            })
            .catch(function(ex) {
                $exceptionHandler(ex);
            });
    }
}

function CreditCardCreateController( $exceptionHandler, $state, OrderCloud) {
    var vm = this;
    vm.creditCard = {};
    //TODO: stop faking the token
    vm.creditCard.Token = "token";
    vm.Submit = function() {
        var expiration = vm.creditCard.ExpirationDate;
        expiration.setMonth(expiration.getMonth() + 1);
        expiration.setDate(expiration.getDate() - 1);
        vm.creditCard.ExpirationDate = expiration;
        OrderCloud.CreditCards.Create(vm.creditCard)
            .then(function() {
                $state.go('creditCards', {}, {reload:true})
            })
            .catch(function(ex) {
                $exceptionHandler(ex);
            });
    }
}

function CreditCardAssignController(OrderCloud, Buyer, UserGroupList, AssignedUserGroups, SelectedCreditCard, Assignments, Paging) {
    var vm = this;
    vm.buyer = Buyer;
    vm.assignBuyer = false;
    vm.list = UserGroupList;
    vm.assignments = AssignedUserGroups;
    vm.creditCard = SelectedCreditCard;
    vm.saveAssignments = SaveAssignments;
    vm.pagingfunction = PagingFunction;

    function SaveFunc(ItemID) {
        return OrderCloud.CreditCards.SaveAssignment({
            CreditCardID: vm.creditCard.ID,
            UserID: null,
            UserGroupID: ItemID
        });
    }

    function DeleteFunc(ItemID) {
        return OrderCloud.CreditCards.DeleteAssignment(vm.creditCard.ID, null, ItemID);
    }

    function SaveAssignments() {
        return Assignments.saveAssignments(vm.list.Items, vm.assignments.Items, SaveFunc, DeleteFunc, 'UserGroupID');
    }

    function AssignFunc() {
        return OrderCloud.CreditCards.ListAssignments(vm.creditCard.ID, null, null, null, vm.assignments.Meta.Page + 1, vm.assignments.Meta.PageSize);
    }

    function PagingFunction() {
        return Paging.paging(vm.list, 'UserGroups', vm.assignments, AssignFunc);
    }
}
