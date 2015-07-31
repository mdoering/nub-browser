require('bootstrap/dist/css/bootstrap.css');
require('angular');
require('angular-resource');
require('angular-route');

var taxApp = angular.module('nubBrowser', ['ngRoute']);
var apiBase ='http://api.gbif.org/v1/';

// configure our routes
taxApp.config(function($routeProvider) {
  $routeProvider
      .when('/', {
        templateUrl : 'html/root.html',
        controller  : 'RootController',
        controllerAs: 'root'
      })
      .when('/{id}', {
        templateUrl : 'html/taxon.html',
        controller  : 'TaxonController',
        controllerAs: 'taxon'
      })
      .otherwise({
        redirect: '/'
      });
});


taxApp.controller('RootController', ['$http', function($http) {
  var self = this;
  console.log("new root controller");

  self.kingdoms = [];

  // load root kingdoms
  var getRoot = function() {
    console.log("get root taxa");
    $http.get(apiBase+"species/root/d7dddbf4-2cf0-4f39-9b2a-bb099caae36c").success(function (data) {
      self.kingdoms = data.results;
    });
  };
  // load data
  getRoot();
}]);


taxApp.controller('TaxonController', ['$http', '$routeParams', function($http, $routeParams) {
  var self = this;
  console.log("new taxon controller");
  console.log($routeParams);

  self.details;
  self.accepted;
  self.basionym;
  self.parents = [];
  self.synonyms = [];
  self.children = [];

  // retrieves all taxon details
  var loadTaxon = function(key) {
    var taxonUrl = apiBase + 'species/' + key;
    console.log("load " + taxonUrl);
    $http.get(taxonUrl).success(function (data) {
      self.details = data;
    });
    $http.get(taxonUrl+"/children").success(function (data) {
      self.children = data.results;
    });
    $http.get(taxonUrl+"/synonyms").success(function (data) {
      self.synonyms = data.results;
    });
  };

  // load data
  loadTaxon(key);
}]);
