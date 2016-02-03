angular.module( 'orderCloud' )

    .config( LoginConfig )
    .factory( 'LoginService', LoginService )
    .controller( 'LoginCtrl', LoginController )

;

function LoginConfig( $stateProvider ) {
    $stateProvider
        .state( 'login', {
            url: '/login/:token',
            templateUrl:'login/templates/login.tpl.html',
            controller:'LoginCtrl',
            controllerAs: 'login'
        })
}

function LoginService( $q, $window, OrderCloud, $resource, $timeout, BuyerID, clientid, apiurl, buyerid ) {
    return {
        SendVerificationCode: _sendVerificationCode,
        ResetPassword: _resetPassword,
        RegisterUser: _registerUser
    };

    function _sendVerificationCode(email) {
        var deferred = $q.defer();

        var passwordResetRequest = {
            Email: email,
            ClientID: clientid,
            URL: encodeURIComponent($window.location.href) + '{0}'
        };

        OrderCloud.PasswordResets.SendVerificationCode(passwordResetRequest)
            .then(function() {
                deferred.resolve();
            })
            .catch(function(ex) {
                deferred.reject(ex);
            });

        return deferred.promise;
    }

    function _resetPassword(resetPasswordCredentials, verificationCode) {
        var deferred = $q.defer();

        var passwordReset = {
            ClientID: clientid,
            Username: resetPasswordCredentials.ResetUsername,
            Password: resetPasswordCredentials.NewPassword
        };

        OrderCloud.PasswordResets.ResetPassword(verificationCode, passwordReset).
            then(function() {
                deferred.resolve();
            })
            .catch(function(ex) {
                deferred.reject(ex);
            });

        return deferred.promise;
    }

    function _registerUser(registerCredentials) {
        var deferred = $q.defer();
        var authToken;

        var creds = {Username: 'RegistrationUser', Password: 'RegistrationUser451'};
        OrderCloud.Auth.GetToken(creds)
            .then(function(data) {
                authToken = data['access_token'];
                createUser();
            });

        function randomPassword() {
            var chars = "0123456789abcdefghijklmnopqrstuvwxyz?.ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()";
            var string_length = 12;
            var randomstring = '';
            for (var i=0; i<string_length; i++) {
                var rnum = Math.floor(Math.random() * chars.length);
                randomstring += chars.substring(rnum,rnum+1);
            }

            return randomstring;
        }

        function createUser() {
            var user = {
                "Username": registerCredentials.Username,
                "Password": randomPassword(),
                "FirstName": registerCredentials.FirstName,
                "LastName": registerCredentials.LastName,
                "Email": registerCredentials.Email,
                "Active": true,
                "xp": {
                    "TempUser": true,
                    "FirstLogin": true
                },
                "SecurityProfileID": "FedExFull"
            };

            $timeout($resource(apiurl + '/v1/buyers/:buyerID/users', {'buyerID': buyerid}, {
                        callApi: {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ' + authToken
                        }
                    }
                }).callApi(user).$promise
                .then(function(data) {
                    deferred.resolve();
                })
                .catch(function(ex) {
                    deferred.reject();
                }),
            500);

        }

        return deferred.promise;
    }
}

function LoginController( $state, $stateParams, $exceptionHandler, OrderCloud, LoginService, buyerid ) {
    var vm = this;
    vm.credentials = {
        Username: null,
        Password: null
    };
    vm.token = $stateParams.token;
    vm.form = vm.token ? 'reset' : 'login';
    vm.setForm = function(form) {
        vm.form = form;
    };

    vm.submit = function() {
        OrderCloud.Auth.GetToken(vm.credentials)
            .then(function(data) {
                OrderCloud.Auth.SetToken(data['access_token']);
                OrderCloud.BuyerID.Get() ? angular.noop() : OrderCloud.BuyerID.Set(buyerid);
                $state.go('home');
            })
            .catch(function(ex) {
                $exceptionHandler(ex);
            })
    };

    vm.forgotPassword = function() {
        LoginService.SendVerificationCode(vm.credentials.Email)
            .then(function() {
                vm.setForm('verificationCodeSuccess');
                vm.credentials.Email = null;
            })
            .catch(function(ex) {
                $exceptionHandler(ex);
            });
    };

    vm.resetPassword = function() {
        LoginService.ResetPassword(vm.credentials, vm.token)
            .then(function() {
                vm.setForm('resetSuccess');
                vm.token = null;
                vm.credentials.ResetUsername = null;
                vm.credentials.NewPassword = null;
                vm.credentials.ConfirmPassword = null;
            })
            .catch(function(ex) {
                $exceptionHandler(ex);
                vm.credentials.ResetUsername = null;
                vm.credentials.NewPassword = null;
                vm.credentials.ConfirmPassword = null;
            });
    };

    vm.registerCredentials = {};
    vm.register = function() {
        LoginService.RegisterUser(vm.registerCredentials)
            .then(function() {
                vm.setForm('login');
                vm.registerSuccess = true;
                vm.registerCredentials = {};
            })
            .catch(function() {
                vm.setForm('login');
                vm.registerSuccess = false;
                vm.registerCredentials = {};
            });
    };
}