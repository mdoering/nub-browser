'use strict';

// Declare app level module which depends on views, and components
angular.module('nubBrowser', ['ngRoute', 'leaflet-directive'])

.constant("CFG", {
  "api": "http://api.gbif-uat.org/v1/",
  "apiPrev": "http://api.gbif.org/v1/",
  "datasetKey": "d7dddbf4-2cf0-4f39-9b2a-bb099caae36c"
})
    
.config(['$routeProvider', function($routeProvider) {
  $routeProvider
  .when('/', {
    templateUrl: 'view/root.html',
    controller: 'RootCtrl',
    controllerAs: 'root'
  })
  .when('/search/:q', {
    templateUrl: 'view/search.html',
    controller: 'SearchCtrl',
    controllerAs: 'search'
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

.controller('TaxonCtrl', ['$scope', '$http', 'CFG', '$routeParams', function($scope, $http, CFG, $routeParams) {
  var self = this;

  self.key = $routeParams.id;
  self.details = {};
  self.parents = [];
  self.synonyms = [];
  self.children = [];
  self.combinations = [];

  var speciesUrl = CFG.api + 'species/' + self.key;

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
    $http.get(CFG.api + 'treemap/children/' + self.key).success(function (data) {
      self.children = data;
    });
    pageSynonyms(0);
    $http.get(speciesUrl+"/combinations").success(function (data) {
      self.combinations = data;
    });
  };

  // load data
  loadTaxon();

  // setup map tiles
  angular.extend($scope, {
      layers: {
          baselayers: {
              osm: {
                  name: 'OpenStreetMap',
                  url: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                  type: 'xyz',
                  "layerOptions": {
                      "showOnSelector": false
                  }
              }
          },
          overlays: {
              gbifPrev: {
                  name: 'GBIF Previous',
                  url: CFG.apiPrev + 'map/density/tile?x={x}&y={y}&z={z}&type=TAXON&resolution=2&palette=purples&key='+self.key,
                  visible: true,
                  type: 'xyz'
              },
              gbif: {
                  name: 'GBIF',
                  url: CFG.api + 'map/density/tile?x={x}&y={y}&z={z}&type=TAXON&resolution=2&key='+self.key,
                  visible: true,
                  type: 'xyz'
              }
          }
      },
      defaults: {
          scrollWheelZoom: false,
          showSelector: false
      }
  });
}])

.controller('SearchCtrl', ['$http', 'CFG', '$routeParams', function($http, CFG, $routeParams) {
  var self = this;
  self.query = $routeParams.q;
  self.results = [];

  var search = function() {
    $http.get(CFG.api+"species/search?limit=50&datasetKey="+CFG.datasetKey+"&q="+self.query).success(function (data) {
    //$http.get(CFG.api+"species?limit=50&datasetKey="+CFG.datasetKey+"&name="+self.query).success(function (data) {
      self.results = data.results;
    });
  };
  search();
}])

.controller('MainCtrl', ['$scope', '$location', function($scope, $location) {
  $scope.search = function() {
    $location.path("/search/"+$scope.query);
  };
}])

.directive("occChange", function($http, CFG) {
    return {
        restrict: "EA",
        replace: false,
        scope: {taxon: '='},
        link: function(scope, elem, attrs) {
            var chart = d3.select(elem[0]);
            // calc change
            $http.get(CFG.api + "occurrence/count?taxonKey=" + scope.taxon).success(function (data) {
                //console.log(data);
                $http.get(CFG.apiPrev + "occurrence/count?taxonKey=" + scope.taxon).success(function (data2) {
                    var perc = data2 == 0 ? (data == 0 ? 1 : 0) : Math.min(999, Math.round(100 * data / data2));
                    chart.text(data2);
                    if (perc > 200) {
                        chart.attr("class", "muchmore");
                    } else if (perc > 110){
                        chart.attr("class", "more");
                    } else if (perc < 50){
                        chart.attr("class", "muchless");
                    } else if (perc < 90){
                        chart.attr("class", "less");
                    }
                });
            });
        }
    };
})

.directive("treeMap", function() {
    return {
        restrict: "EA",
        replace: true,
        //our data source would be an array with name & size fields
        scope: {
            tree: '=',
            width: '=',
            height: '='
        },
        link: function(scope, elem, attrs) {
            var unwatch = scope.$watch('tree', function(newVal, oldVal) {
                if (newVal && newVal.length>0) {
                    render();
                    // remove the watcher
                    unwatch();
                }

                function load(key, t) {
                    console.log(key);
                }

                function position() {
                    this.style("left", function(d) { return d.x + "px"; })
                        .style("top", function(d) { return d.y + "px"; })
                        .style("width", function(d) { return Math.max(0, d.dx - 1) + "px"; })
                        .style("height", function(d) { return Math.max(0, d.dy - 1) + "px"; });
                }

                function render(){
                    console.log(scope.tree);
                    var data2 = {"name": "backbone", "children": scope.tree};

                    var container = d3.select(elem[0]);

                    var tpdiv = container.append("div")
                        .attr("class", "tooltip")
                        .style("opacity", 0);

                    var div = container.append("div")
                        .attr("class", "tmap");

                    var treemap = d3.layout.treemap()
                        .size([scope.width, scope.height])
                        .sticky(true)
                        .round(false)
                        .value(function (d) {
                            return d.size + 1;
                        });

                    var node = div.datum(data2).selectAll(".node")
                        .data(treemap.nodes)
                        .enter().append("div")
                        .attr("class", "node")
                        //.attr("id", function(d){return d.key;})
                        .call(position)
                        .text(function (d) {return d.name;})
                        .on("mouseover", function (d) {
                            tpdiv.transition()
                                .duration(200)
                                .style("opacity", .9);
                            tpdiv.html(d.name + "<div class='size'>" + d.size + "</div>")
                                .style("left", (d3.event.pageX) + "px")
                                .style("top", (d3.event.pageY - 28) + "px");
                        })
                        .on("mouseout", function (d) {
                            tpdiv.transition()
                                .duration(500)
                                .style("opacity", 0);
                        })
                        .on("click", function(d){
                            window.location.href="#/taxon/"+ d.key;
                        })
                        ;
                }
            });
        }
    }
})

.directive("barsChart", function($window) {
    return {
        restrict: "EA",
        replace: false,
        scope: {data: '=chartData'},
        link: function(scope, elem, attrs){
            var chart = d3.select(elem[0]);
            //to our original directive markup bars-chart
            //we add a div with out chart stling and bind each
            //data entry to the chart
            chart.append("div").attr("class", "chart")
                .selectAll('div')
                .data(scope.data).enter().append("div")
                .transition().ease("elastic")
                .style("width", function(d) { return d + "%"; })
                .text(function(d) { return d + "%"; });        }
    };
})
;

