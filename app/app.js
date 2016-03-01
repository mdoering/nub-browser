'use strict';

// Declare app level module which depends on views, and components
angular.module('nubBrowser', ['ngRoute', 'leaflet-directive'])

.constant("CFG", {
  //"api": "http://api.gbif-uat.org/v1/",
  //"apiPrev": "http://api.gbif.org/v1/",
  "api": "http://localhost:8080/uat/",
  "apiPrev": "http://localhost:8080/",
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

.controller('TaxonCtrl', ['$rootScope', '$scope', '$http', 'CFG', '$routeParams', function($rootScope, $scope, $http, CFG, $routeParams) {
  var self = this;
  var occCounts = 0;

  self.key = $routeParams.id;
  self.details = {};
  self.parents = [];
  self.synonyms = [];
  self.children = [];
  self.combinations = [];
  self.childrenOcc = [];

  var speciesUrl = CFG.api + 'species/' + self.key;

  var pageSynonyms = function(offset) {
    var url = speciesUrl+"/synonyms?limit=20&offset="+offset;
    $http.get(url).success(function (resp) {
      if (resp.results.length > 0) {
        self.synonyms = self.synonyms.concat(resp.results);
        if (!resp.endOfRecords){
          pageSynonyms(20+resp.offset);
        } else {
          self.synonyms.forEach(addCounts);
        }
      }
    })
  };

  function addCounts(obj) {
      ++occCounts;
      $http.get(CFG.api + "occurrence/count?taxonKey=" + obj.key).success(function (data) {
          obj.occ = data;
          $http.get(CFG.apiPrev + "occurrence/count?taxonKey=" + obj.key).success(function (data2) {
              if(--occCounts === 0) {
                  $rootScope.$broadcast('occ-counted');
              }
              obj.occPrev = data2;
              obj.occRatio = data2 == 0 ? (data == 0 ? 1 : 0) : data / data2;
              if (obj.occRatio > 2) {
                  obj.occRatioClass="muchmore";
              } else if (obj.occRatio > 1.1){
                  obj.occRatioClass="more";
              } else if (obj.occRatio < 0.5){
                  obj.occRatioClass="muchless";
              } else if (obj.occRatio < 0.9){
                  obj.occRatioClass="less";
              }
          }).error(function(msg){
              if(--occCounts === 0) {
                  $rootScope.$broadcast('occ-counted');
              }
          });
      }).error(function(msg){
          if(--occCounts === 0) {
              $rootScope.$broadcast('occ-counted');
          }
      });
  }

  // retrieves all taxon details
  $http.get(speciesUrl).success(function (data) {
      self.details = data;
      addCounts(self.details);
  });
  $http.get(speciesUrl+"/parents").success(function (data) {
      self.parents = data;
      self.parents.forEach(addCounts);
  });
  $http.get(CFG.api + 'treemap/children/' + self.key).success(function (data) {
      self.children = data;
      // add occurrence counts to each child
      self.children.forEach(addCounts);
      $rootScope.$broadcast('children-retrieved');
  });
  $http.get(speciesUrl+"/combinations").success(function (data) {
      self.combinations = data;
      self.combinations.forEach(addCounts);
  });
  pageSynonyms(0);

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

.filter('humanSize', function() {
    function trim(num, chars) {
        var x = num+"";
        if (x.length > chars) {
            x = x.substr(0, chars);
            if (x[chars-1] == '.' ) {
                x = x.substr(0, chars-1);
            }
        }
        return x;
    }
    return function(num) { // first arg is the input, rest are filter params
        if (num > 1000000000) {
            return trim(num/1000000000, 3) + "B";
        } else if (num > 1000000) {
            return trim(num/1000000, 3) + "M";
        } else if (num > 1000) {
            return trim(num/1000, 3) + "K";
        }
        return num;
    }
})
.directive('occChange', function() {
    return {
        restrict: "E",
        scope: {taxon: '='},
        template: '<div ng-class="taxon.occRatioClass">{{taxon.occ | humanSize}}</div>'
    };
})
.directive("treeMap", ['$rootScope', '$filter', function($rootScope, $filter) {
    return {
        restrict: "E",
        replace: true,
        scope: {
            tree: '=',
            event: '@',
            sizeAttr: '@',
            classAttr: '@?',
            width: '=',
            height: '='
        },
        link: function(scope, elem, attrs) {
            $rootScope.$on(scope.event, function (){
                if (scope.tree.length > 0) {
                    render();
                } else {
                    var unwatch = scope.$watch('tree', function(newVal, oldVal) {
                        if (scope.tree.length > 0) {
                            render();
                            // remove the watcher
                            unwatch();
                        }
                    });
                }
            });
            function render(){
                console.log("Render tree-map for event "+scope.event);
                // we copy the data cause treemap will resort the array...
                var data2 = {"name": "backbone", "children": angular.copy(scope.tree)};
                console.log(data2);
                var container = d3.select(elem[0]);
                container.html("");
                var tpdiv = d3.select("body").append("div")
                    .attr("class", "tooltip")
                    .style("opacity", 0);

                var div = container.append("div")
                    .attr("class", "tmap")
                    .style("width", scope.width + "px")
                    .style("height", scope.height + "px")

                var treemap = d3.layout.treemap()
                    .size([scope.width, scope.height])
                    .sticky(true)
                    .round(false)
                    .value(function (d) {
                        return d[scope.sizeAttr] + 1;
                    });

                var nodeCl = scope.classAttr ? function(d){return "node" + (d[scope.classAttr] ? " "+d[scope.classAttr] : "")} : "node";
                var node = div.datum(data2).selectAll(".node")
                    .data(treemap.nodes)
                    .enter().append("div")
                    .attr("class", nodeCl)
                    .call(position)
                    .text(function (d) {return d.name;})
                    .on("mouseover", function (d) {
                        tpdiv.transition()
                            .duration(200)
                            .style("opacity", .9);
                        tpdiv.html(d.name + "<div class='size'>" + $filter('number')(d[scope.sizeAttr]) + "</div>")
                            .style("left", (d3.event.pageX + 15) + "px")
                            .style("top", (d3.event.pageY - 40) + "px");
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
            function position() {
                this.style("left", function(d) { return d.x + "px"; })
                    .style("top", function(d) { return d.y + "px"; })
                    .style("width", function(d) { return Math.max(0, d.dx - 1) + "px"; })
                    .style("height", function(d) { return Math.max(0, d.dy - 1) + "px"; });
            }
        }
    }
}])

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

