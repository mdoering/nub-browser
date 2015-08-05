'use strict';

// Declare app level module which depends on views, and components
angular.module('nubBrowser', ['ngRoute'])

.constant("GBIF_API", "http://api.gbif.org/v1/")

.config(['$routeProvider', function($routeProvider) {
  $routeProvider
  .when('/', {
      templateUrl: 'view/root.html',
      controller: 'RootCtrl',
      controllerAs: 'root'
    })
  .when('/taxon/:id', {
    templateUrl: 'view/taxon.html',
    controller: 'TaxonCtrl',
    controllerAs: 'taxon'
  })
  .otherwise({redirectTo: '/'});
}])


.controller('RootCtrl', ['$http', 'GBIF_API', function($http, GBIF_API) {
  var self = this;

  self.kingdoms = [];

  // load root kingdoms
  var getRoot = function() {
    $http.get(GBIF_API+"species/root/d7dddbf4-2cf0-4f39-9b2a-bb099caae36c").success(function (data) {
      self.kingdoms = data.results;
    });
  };
  // load data
  getRoot();
}])

.controller('TaxonCtrl', ['$http', '$routeParams', 'GBIF_API', function($http, $routeParams, GBIF_API) {
  var self = this;

  self.key;
  self.details;
  self.parents = [];
  self.synonyms = [];
  self.children = [];

  // retrieves all taxon details
  var loadTaxon = function(id) {
    self.key = id;
    var taxonUrl = GBIF_API + 'species/' + id;
    console.log("load " + taxonUrl);
    $http.get(taxonUrl).success(function (data) {
      self.details = data;
    });
    $http.get(taxonUrl+"/parents").success(function (data) {
      self.parents = data;
    });
    $http.get(taxonUrl+"/children").success(function (data) {
      self.children = data.results;
    });
    $http.get(taxonUrl+"/synonyms").success(function (data) {
      self.synonyms = data.results;
    });
  };
      
  // load data
  loadTaxon($routeParams.id);
}])



