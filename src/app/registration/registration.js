angular.module( 'orderCloud' )

    .config( RegistrationConfig )
    .factory( 'RegistrationService', RegistrationService )
    .controller( 'RegistrationCtrl', RegistrationController )

;

function RegistrationConfig($stateProvider) {
    $stateProvider
        .state( 'registration', {
            parent: 'base',
            url: '/registration',
            templateUrl:'registration/templates/registration.tpl.html',
            controller:'RegistrationCtrl',
            controllerAs: 'registration',
            resolve: {
                Requests: function( BaseService ) {
                    return BaseService.GetRegistrationRequests()
                }
            }
        })
    ;
}

function RegistrationService($q, OrderCloud) {
    var service = {
        Accept: _accept,
        Deny: _deny
    };

    function _accept(user) {
        var deferred = $q.defer();

        user.xp.TempUser = false;

        OrderCloud.Users.Update(user.ID, user)
            .then(function(user) {
                deferred.resolve(user);
            });

        return deferred.promise;
    }

    function _deny(user) {
        var deferred = $q.defer();

        OrderCloud.Users.Delete(user.ID)
            .then(function() {
                deferred.resolve();
            });

        return deferred.promise;
    }

    return service;
}

function RegistrationController($state, toastr, RegistrationService, Requests) {
    var vm = this;
    vm.requests = Requests;

    vm.acceptUser = function(user) {
        RegistrationService.Accept(user)
            .then(function(user) {
                toastr.success(user.FirstName + ' ' + user.LastName + ' has been accepted!', 'Success!');
                $state.reload();
            });
    };

    vm.denyUser = function(user) {
        RegistrationService.Deny(user)
            .then(function() {
                toastr.info(user.FirstName + ' ' + user.LastName + ' has been denied!');
                $state.reload();
            });
    };
}