'use strict';

// Declare app level module which depends on views, and components
angular.module('nubBrowser', ['ngRoute'])

.constant("CFG", {
  "api": "http://api.gbif.org/v1/",
  "datasetKey": "d7dddbf4-2cf0-4f39-9b2a-bb099caae36c"
})
    
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


.controller('RootCtrl', ['$http', 'CFG', function($http, CFG) {
  var self = this;
  self.kingdoms = [];
      
  // load root kingdoms
  var getRoot = function() {
    $http.get(CFG.api+"species/root/"+CFG.datasetKey).success(function (data) {
      self.kingdoms = data.results;
    });
  };
  // load data
  getRoot();
}])

.controller('TaxonCtrl', ['$http', 'CFG', '$routeParams', function($http, CFG, $routeParams) {
  var self = this;

  self.key = $routeParams.id;
  self.details;
  self.parents = [];
  self.synonyms = [];
  self.children = [];

  var speciesUrl = CFG.api + 'species/' + self.key;
  console.log(speciesUrl);

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

.controller('SearchCtrl', ['$http', 'CFG', function($http, CFG) {
  var self = this;
  self.query;
  self.results = [];

  var search = function(q) {
    console.log("search " +q);
    console.log(self);
    $http.get(CFG.api+"species/search?limit=50&datasetKey="+CFG.datasetKey+"&q="+self.query).success(function (data) {
      self.results = data.results;
    });
  };
}]);



