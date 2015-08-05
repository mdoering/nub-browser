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

  self.key = $routeParams.id;
  self.details;
  self.parents = [];
  self.synonyms = [];
  self.children = [];

  var speciesUrl = GBIF_API + 'species/' + self.key;

  var pageChildren = function(offset) {
    var url = speciesUrl+"/children?limit=20&offset="+offset;
    $http.get(url).success(function (resp) {
      if (resp.results.length > 0) {
        self.children = self.children.concat(resp.results);
        if (!resp.endOfRecords){
          pageChildren(20+resp.offset);
        }
      }
    })
  };

  var pageSynonyms = function(offset) {
    var url = speciesUrl+"/synonyms?limit=20&offset="+offset;
    $http.get(url).success(function (resp) {
      if (resp.results.length > 0) {
        self.synonyms = self.synonyms.concat(resp.results);
        if (!resp.endOfRecords){
          pageSynonyms(20+resp.offset);
        }
      }
    })
  };

  // retrieves all taxon details
  var loadTaxon = function() {
    console.log("load " + speciesUrl);
    $http.get(speciesUrl).success(function (data) {
      self.details = data;
    });
    $http.get(speciesUrl+"/parents").success(function (data) {
      self.parents = data;
    });
    pageChildren(0);
    pageSynonyms(0);
  };

  // load data
  loadTaxon();
}])



