angular.module('orderCloud')
    .config(CheckoutFEConfig)
    .controller('DeliveryCtrl', DeliveryCtrl)
    .controller('PaymentCtrl', PaymentCtrl)
    .controller('DateNeededCtrl', DateNeededCtrl)
;

function CheckoutFEConfig($stateProvider) {
    $stateProvider
        .state('delivery', {
            parent: 'base',
            url: '/delivery',
            templateUrl: 'checkoutFE/templates/checkout.delivery.tpl.html',
            controller: 'DeliveryCtrl',
            controllerAs: 'delivery',
            resolve: {
                Order: function($q, $state, toastr, CurrentOrder) {
                    var dfd = $q.defer();
                    CurrentOrder.Get()
                        .then(function(order) {
                            dfd.resolve(order)
                        })
                        .catch(function() {
                            toastr.error('You do not have an active open order.', 'Error');
                            if ($state.current.name.indexOf('checkout') > -1) {
                                $state.go('home');
                            }
                            dfd.reject();
                        });
                    return dfd.promise;
                },
                OrderShipAddress: function($q, OrderShippingAddress) {
                    var dfd = $q.defer();
                    OrderShippingAddress.Get()
                        .then(function(data) {
                            dfd.resolve(data);
                        })
                        .catch(function() {
                            dfd.resolve(null);
                        });
                    return dfd.promise;
                },
                ShippingAddresses: function($q, OrderCloud, Underscore) {
                    var dfd = $q.defer();
                    OrderCloud.Me.ListAddresses()
                        .then(function(data) {
                            dfd.resolve(Underscore.where(data.Items, {Shipping:true}));
                        });
                    return dfd.promise;
                }
            }
        })
        .state('payment', {
            parent: 'base',
            url: '/payment',
            templateUrl: 'checkoutFE/templates/checkout.payment.tpl.html',
            controller: 'PaymentCtrl',
            controllerAs: 'payment',
            resolve: {
                Order: function($q, $state, toastr, CurrentOrder) {
                    var dfd = $q.defer();
                    CurrentOrder.Get()
                        .then(function(order) {
                            dfd.resolve(order)
                        })
                        .catch(function() {
                            toastr.error('You do not have an active open order.', 'Error');
                            if ($state.current.name.indexOf('checkout') > -1) {
                                $state.go('home');
                            }
                            dfd.reject();
                        });
                    return dfd.promise;
                },
                BillingAddresses: function($q, Underscore, OrderCloud) {
                    var dfd = $q.defer();
                    OrderCloud.Me.ListAddresses()
                        .then(function(data) {
                            dfd.resolve(Underscore.where(data.Items, {Biling: true}));
                        });
                    return dfd.promise;
                },
                ShippingAddresses: function($q, OrderCloud, Underscore) {
                    var dfd = $q.defer();
                    OrderCloud.Me.ListAddresses()
                        .then(function(data) {
                            dfd.resolve(Underscore.where(data.Items, {Shipping:true}));
                        });
                    return dfd.promise;
                }
            }
        })
    ;
}

function DeliveryCtrl($rootScope, $scope, $state, $uibModal, Order, OrderCloud, OrderShipAddress, BaseService, LineItems, OrderShippingAddress, ShippingAddresses) {
    var vm = this;

    function getMarkups() {
        LineItems.List(vm.currentOrder.ID, 1, 100)
            .then(function(data) {
                var lineItems = data.Items;
                angular.forEach(lineItems, function(lineItem) {
                    lineItem.Markup = BaseService.CalculateLineItemMarkups(lineItem);
                });
                vm.currentOrder.Markup = BaseService.CalculateTotalMarkup(lineItems);
            });
    }

    vm.currentOrder = Order;
    vm.currentOrder.ShippingAddressID = OrderShipAddress ? OrderShipAddress.ID : null;
    vm.currentOrder.ShippingAddress = OrderShipAddress;
    vm.shippingAddresses = ShippingAddresses;
    vm.isMultipleAddressShipping = true;

    getMarkups();

    vm.minDate = new Date();
    if (!vm.currentOrder.xp) vm.currentOrder.xp = {};
    vm.currentOrder.xp.DateNeeded = (vm.currentOrder.xp && vm.currentOrder.xp.DateNeeded) ? new Date(vm.currentOrder.xp.DateNeeded) : null;


    vm.orderIsValid = vm.currentOrder.BillingAddress && vm.currentOrder.BillingAddress.ID != null && vm.currentOrder.PaymentMethod != null;

    // default state (if someone navigates to checkout -> checkout.shipping)
    if ($state.current.name === 'checkout') {
        $state.transitionTo('checkout.shipping');
    }

    $rootScope.$on('OrderShippingAddressChanged', function(event, order, address) {
        vm.currentOrder = order;
        vm.currentOrder.ShippingAddressID = address.ID;
        vm.currentOrder.ShippingAddress = address;
        getMarkups();
    });

    $rootScope.$on('OC:UpdateOrder', function(event, OrderID) {
        OrderCloud.Orders.Get(OrderID)
            .then(function(data) {
                vm.currentOrder.Subtotal = data.Subtotal;
                vm.currentOrder.xp = vm.currentOrder.xp ? data.xp : {};
                getMarkups();
            });
    });

    $rootScope.$on('LineItemAddressUpdated', function() {
        vm.currentOrder.ShippingAddress = null;
        vm.currentOrder.ShippingAddressID = null;
        OrderShippingAddress.Clear();
    });

    vm.saveAddress = null;
    vm.isAlsoBilling = null;
    vm.address = {};
    vm.SaveShippingAddress = saveShipAddress;
    vm.SaveCustomAddress = saveCustomAddress;
    vm.customShipping = false;
    vm.shippingAddress = null;

    function saveShipAddress(order) {
        if (order && order.ShippingAddressID) {
            OrderShippingAddress.Set(order.ShippingAddressID);
            OrderCloud.Addresses.Get(order.ShippingAddressID)
                .then(function(address){
                    OrderCloud.Orders.SetShippingAddress(order.ID, address)
                        .then(function() {
                            $rootScope.$broadcast('OrderShippingAddressChanged', order, address);
                        });
                })

        }
    }

    function saveCustomAddress(order) {
        if (vm.saveAddress) {
            OrderCloud.Addresses.Create(vm.address)
                .then(function(address) {
                    OrderCloud.Me.Get()
                        .then(function(me) {
                            OrderCloud.Addresses.SaveAssignment({
                                    AddressID: address.ID,
                                    UserID: me.ID,
                                    IsBilling: vm.isAlsoBilling,
                                    IsShipping: true
                                })
                                .then(function() {
                                    OrderCloud.Addresses.Get(address.ID)
                                        .then(function(address) {
                                            OrderCloud.Orders.SetShippingAddress(order.ID, address)
                                                .then(function() {
                                                    $state.reload();
                                                });
                                        })
                                });
                        });
                });
        }
        else {
            OrderCloud.Orders.SetShippingAddress(order.ID, vm.address)
                .then(function() {
                    $state.reload();
                });
        }
    }

    $scope.$watch(function () {
        return vm.currentOrder.xp.DateNeeded;
    },function(newValue, oldValue){
        var nvDate = newValue ? new Date(newValue) : null;
        var ovDate = oldValue ? new Date(oldValue) : null;
        if (!nvDate) return;
        if ((vm.currentOrder && vm.currentOrder.xp && vm.currentOrder.xp.DateNeeded && oldValue && nvDate.getTime() != ovDate.getTime()) || !ovDate) {
            var dateNeededInstance = $uibModal.open({
                templateUrl: 'checkoutFE/templates/shipper.tpl.html',
                controller: 'DateNeededCtrl',
                controllerAs: 'dateNeeded',
                resolve: {
                    DateNeeded: function() {
                        return nvDate;
                    },
                    Order: function() {
                        return vm.currentOrder;
                    }
                }
            });

            dateNeededInstance.result.then(function (order) {
                vm.currentOrder = order;
                OrderCloud.Orders.Update(vm.currentOrder.ID, vm.currentOrder)
                    .then(function(data) {
                        vm.currentOrder = data;
                        vm.currentOrder.ShippingAddressID = order.ShippingAddress.ID;
                        getMarkups();
                    });
            }, function () {
                console.log('cancelled');
            });
        }
    });

    vm.continue = function() {
        OrderCloud.Orders.Update(vm.currentOrder.ID, vm.currentOrder)
            .then(function(data) {
                $state.go('payment');
            });
    };
}

function PaymentCtrl($state, $rootScope, Order, toastr, BillingAddresses, ShippingAddresses, OrderCloud, CurrentOrder, LineItems, BaseService) {
    var vm = this;
    vm.currentOrder = Order;
    vm.billingAddresses = BillingAddresses;
    vm.shippingAddresses = ShippingAddresses;
    vm.SaveBillingAddress = SaveBillingAddress;
    vm.SaveCustomAddress = SaveCustomAddress;

    function getMarkups() {
        LineItems.List(vm.currentOrder.ID, 1, 100)
            .then(function(data) {
                var lineItems = data.Items;
                angular.forEach(lineItems, function(lineItem) {
                    lineItem.Markup = BaseService.CalculateLineItemMarkups(lineItem);
                });
                vm.currentOrder.Markup = BaseService.CalculateTotalMarkup(lineItems);
            });
    }

    getMarkups();

    function SaveBillingAddress(order) {
        if (order && order.BillingAddressID) {
            OrderCloud.Orders.Patch(order.ID, {BillingAddressID: order.BillingAddressID})
                .then(function() {
                    $state.reload();
                })
                .catch(function() {
                    $exceptionHandler(ex);
                });
        }
    }

    function SaveCustomAddress(order) {
        if (vm.saveAddress) {
            OrderCloud.Addresses.Create(vm.address)
                .then(function(address) {
                    OrderCloud.Me.Get()
                        .then(function(me) {
                            OrderCloud.Addresses.SaveAssignment({
                                    AddressID: address.ID,
                                    UserID: me.ID,
                                    IsBilling: true,
                                    IsShipping: false
                                })
                                .then(function() {
                                    OrderCloud.Orders.SetBillingAddress(order.ID, vm.address)
                                        .then(function() {
                                            $state.reload();
                                        })
                                        .catch(function(ex) {
                                            $exceptionHandler(ex);
                                        });
                                })
                                .catch(function(ex) {
                                    $exceptionHandler(ex);
                                });
                        })
                        .catch(function(ex) {
                            $exceptionHandler(ex);
                        });
                })
                .catch(function(ex) {
                    $exceptionHandler(ex);
                });
        }
        else {
            OrderCloud.Orders.SetBillingAddress(order.ID, vm.address)
                .then(function() {
                    $state.reload();
                })
                .catch(function(ex) {
                    $exceptionHandler(ex);
                });
        }
    }

    vm.CreditCardTypes = [
        'MasterCard',
        'American Express',
        'Discover',
        'Visa'
    ];
    vm.creditCard = null;
    vm.today = new Date();

    vm.saveCreditCard = SaveCreditCard;
    vm.setCreditCard = SetCreditCard;

    function SaveCreditCard(order) {
        // TODO: Needs to save the credit card with integration plug in
        if (vm.creditCard) {
            // This is just until Nick gives me the integration
            vm.Token = 'cc';
            if (vm.creditCard.PartialAccountNumber.length === 16) {
                vm.creditCard.PartialAccountNumber = vm.creditCard.PartialAccountNumber.substr(vm.creditCard.PartialAccountNumber.length - 4);
                OrderCloud.CreditCards.Create(vm.creditCard)
                    .then(function(CreditCard) {
                        OrderCloud.Me.Get()
                            .then(function(me) {
                                OrderCloud.CreditCards.SaveAssignment({
                                        CreditCardID: CreditCard.ID,
                                        UserID: me.ID
                                    })
                                    .then(function() {
                                        OrderCloud.Orders.Patch(order.ID, {CreditCardID: CreditCard.ID})
                                            .then(function() {
                                                $state.reload();
                                            });
                                    });
                            });
                    });
            }
            else {
                toastr.error('Invalid credit card number.', 'Error:');
            }
        }
    }

    function SetCreditCard(order) {
        if (order.CreditCardID && order.PaymentMethod === 'CreditCard') {
            OrderCloud.Orders.Patch(order.ID, {CreditCardID: order.CreditCardID})
                .then(function() {
                    $state.reload();
                });
        }
    }

    vm.changeCreditCard = function() {
        vm.currentOrder.CreditCardID = null;
    };

    vm.continue = function() {
        vm.currentOrder.PaymentMethod = 'CreditCard';
        OrderCloud.Orders.Update(vm.currentOrder.ID, vm.currentOrder)
            .then(function(o) {
                OrderCloud.Orders.Submit(vm.currentOrder.ID)
                    .then(function() {
                        CurrentOrder.Remove()
                            .then(function(){
                                $rootScope.$broadcast('RemoveMiniCartOrder');
                                $state.go('orderReview', {orderid: vm.currentOrder.ID});
                            })
                    })
                    .catch(function(ex) {
                        $exceptionHandler(ex);
                    });
            });

    };
}

function DateNeededCtrl($uibModalInstance, DateNeeded, Order) {
    var vm = this;
    vm.dateNeeded = DateNeeded;
    vm.order = Order;
    vm.Shipper = null;

    function randomThree() {
        var chars = "0123456789";
        var string_length = 3;
        var randomstring = '';
        for (var i=0; i<string_length; i++) {
            var rnum = Math.floor(Math.random() * chars.length);
            randomstring += chars.substring(rnum,rnum+1);
        }

        return randomstring;
    }

    vm.randomAddress = {
        Street1: '400 North 1st Avenue',
        Street2: 'Ste 200',
        City: 'Minneapolis',
        State: 'MN',
        'Zip': '55401'
    };
    if (vm.order && vm.order.ShippingAddress) {
        vm.randomAddress = vm.order.ShippingAddress;
        vm.randomAddress.Street1 = chance.street();
        vm.randomAddress.Street2 = 'Ste ' + randomThree();
    }

    vm.cancel = function() {
        $uibModalInstance.dismiss(null);
    };

    vm.continue = function() {
        switch(vm.order.xp.Shipper) {
            case 'pickup':
                vm.order.xp.ShippingCost = 0;
                break;
            case 'endofday':
                vm.order.xp.ShippingCost = 9.99;
                break;
            case 'local':
                vm.order.xp.ShippingCost = 19.99;
                break;
        }

        $uibModalInstance.close(vm.order);
    };
}