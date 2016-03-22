'use strict';

// Declare app level module which depends on views, and components
angular.module('nubBrowser', ['ngRoute', 'mgcrea.ngStrap', 'mgcrea.ngStrap.helpers.dimensions', 'mgcrea.ngStrap.helpers.debounce'])

    .constant("CFG", {
        "api": "http://api.gbif-uat.org/v1/",
        "apiPrev": "http://api.gbif.org/v1/",
        //"api": "http://localhost:8080/uat/",
        //"apiPrev": "http://localhost:8080/",
        "portal": "http://www.gbif-uat.org/",
        "portalPrev": "http://www.gbif.org/",
        "datasetKey": "d7dddbf4-2cf0-4f39-9b2a-bb099caae36c",
        "mbAccessToken": "pk.eyJ1IjoiZ2JpZiIsImEiOiJjaWxhZ2oxNWQwMDBxd3FtMjhzNjRuM2lhIn0.g1IE8EfqwzKTkJ4ptv3zNQ"
    })

    .run(function ($rootScope, CFG) {
        $rootScope.cfg = CFG;
        mapboxgl.accessToken = CFG.mbAccessToken;
    })

    .config(['$routeProvider', function ($routeProvider) {
        $routeProvider
            .when('/', {
                templateUrl: 'view/root.html', controller: 'RootCtrl', controllerAs: 'ctrl'
            })
            .when('/tree', {
                templateUrl: 'view/tree.html', controller: 'TreeCtrl', controllerAs: 'ctrl'
            })
            .when('/metrics', {
                templateUrl: 'view/metrics.html', controller: 'MetricsCtrl', controllerAs: 'ctrl'
            })
            .when('/search/:q', {
                templateUrl: 'view/search.html', controller: 'SearchCtrl', controllerAs: 'ctrl'
            })
            .when('/taxon/:id', {
                templateUrl: 'view/taxon.html', controller: 'TaxonCtrl', controllerAs: 'ctrl'
            })
            .otherwise({redirectTo: '/'});
    }])

    .controller('RootCtrl', ['CFG', function (CFG) {
        var self = this;
    }])

    .controller('TreeCtrl', ['$scope', '$http', 'CFG', '$location', '$anchorScroll', function ($scope, $http, CFG, $location, $anchorScroll) {
        var self = this;
        // load root classification
        $http.get(CFG.api + "species/rootNub").success(function (data) {
            self.kingdoms = data.root;
            self.children = data.children;
        });
        $anchorScroll.yOffset = 80;   // always scroll by 50 extra pixels
        // prevend routing to kick in when local ToC hash is clicked
        $scope.scrollTo = function(id) {
            console.log("scroll to " + id);
            var old = $location.hash();
            $location.hash(id);
            $anchorScroll();
            //reset to old to keep any additional routing logic from kicking in
            $location.hash(old);
        };
    }])

    .controller('MetricsCtrl', ['$rootScope', '$scope', '$http', 'CFG', function ($rootScope, $scope, $http, CFG) {
        var self = this;
        var kingdoms = {
            "INCERTAE_SEDIS": 0,
            "ANIMALIA": 1,
            "ARCHAEA": 2,
            "BACTERIA": 3,
            "CHROMISTA": 4,
            "FUNGI": 5,
            "PLANTAE": 6,
            "PROTOZOA": 7,
            "VIRUSES": 8
        };

        // load nub metrics
        addMetrics(CFG.api, 0);
        addMetrics(CFG.apiPrev, 1);

        function addMetrics(api, idx) {
            $http.get(api + "dataset/" + CFG.datasetKey + "/metrics").success(function (data) {
                console.log(data);
                addObjProperty("counts", "total usages", data.usagesCount, idx);
                addObjProperty("counts", "synonyms", data.synonymsCount, idx);
                addProperty("kingdoms", data.countByKingdom, idx);
                addProperty("ranks", data.countByRank, idx);
                addProperty("origins", data.countByOrigin, idx);
                addProperty("issues", data.countByIssue, idx);
                for (var k in data.countByKingdom) {
                    const king = k;
                    $http.get(api + "occurrence/count?taxonKey=" + kingdoms[k]).success(function (data) {
                        addObjProperty("kingdomsOcc", king, data, idx);
                    });
                }
            });
        }
        function addProperty(name, data, idx) {
            for (var key in data) {
                addObjProperty(name, key, data[key], idx);
            }
        }
        function addObjProperty(name, key, val, idx) {
            if (!self[name]) {
                self[name] = {};
            }
            if (!self[name][key]) {
                self[name][key] = [0,0];
            }
            self[name][key][idx] = val;
        }
    }])

    .controller('SearchCtrl', ['$http', 'CFG', '$routeParams', function ($http, CFG, $routeParams) {
        var self = this;
        self.query = $routeParams.q;
        self.results = [];

        var search = function () {
            $http.get(CFG.api + "species/search?limit=50&datasetKey=" + CFG.datasetKey + "&q=" + self.query).success(function (data) {
                //$http.get(CFG.api+"species?limit=50&datasetKey="+CFG.datasetKey+"&name="+self.query).success(function (data) {
                self.results = data.results;
            });
        };
        search();
    }])

    .controller('TaxonCtrl', ['$rootScope', '$scope', '$http', 'CFG', '$routeParams', function ($rootScope, $scope, $http, CFG, $routeParams) {
        var self = this;
        var occCounts = 0;

        self.key = $routeParams.id;
        self.tax = loadTaxon(CFG.api, self.key, true);
        self.taxPrev = loadTaxon(CFG.apiPrev, self.key, false);
        self.childrenOcc = [];
        compareBBox(self.key);

        $rootScope.$broadcast('key-set');
        console.log("broadcast " + self.key);


        function loadTaxon(api, key, countOcc) {
            var tax = {};
            tax.parents = [];
            tax.synonyms = [];
            tax.combinations = [];
            tax.children = [];
            tax.homonyms = [];

            var speciesUrl = api + 'species/' + self.key;

            $http.get(speciesUrl).success(function (data) {
                tax.details = data;
                tax.key = key;
                if (countOcc) {
                    addOccCounts(tax.details);
                }
                $http.get(speciesUrl + "/parents").success(function (data) {
                    tax.parents = data;
                    if (tax.details.acceptedKey > 0) {
                        // this is a synonym, add accepted
                        var acc = {};
                        acc.key = tax.details.acceptedKey;
                        acc.canonicalName = tax.details.accepted;
                        acc.rank = tax.details.rank;
                        tax.parents.push(acc);
                    }
                    if (countOcc) {
                        tax.parents.forEach(addOccCounts);
                    }
                });
                if (!tax.details.acceptedKey > 0) {
                    $http.get(speciesUrl + '/childrenAll/').success(function (data) {
                        tax.children = data;
                        // add occurrence counts to each child
                        if (countOcc) {
                            tax.children.forEach(addOccCounts);
                            $rootScope.$broadcast('children-retrieved');
                        }
                    });
                    $http.get(speciesUrl + "/synonyms?limit=100").success(function (resp) {
                        if (resp.results.length > 0) {
                            tax.synonyms = resp.results;
                            if (countOcc) {
                                tax.synonyms.forEach(addOccCounts);
                            }
                        }
                    });
                }
                $http.get(speciesUrl + "/combinations").success(function (data) {
                    tax.combinations = data;
                    if (countOcc) {
                        tax.combinations.forEach(addOccCounts);
                    }
                });
                $http.get(api + 'species?datasetKey=' + CFG.datasetKey + '&name=' + tax.details.canonicalName).success(function (data) {
                    tax.homonyms = data.results.filter(function(t) {
                        return t.key != key;
                    });
                });
            }).error(function (msg) {
                console.log(msg);
            });
            return tax;
        }

        function addOccCounts(obj) {
            ++occCounts;
            $http.get(CFG.api + "occurrence/count?taxonKey=" + obj.key).success(function (data) {
                obj.occ = data;
                $http.get(CFG.apiPrev + "occurrence/count?taxonKey=" + obj.key).success(function (dataPrev) {
                    if (--occCounts === 0) {
                        $rootScope.$broadcast('occ-counted');
                    }
                    obj.occPrev = dataPrev;
                    obj.occRatio = dataPrev == 0 ? (data == 0 ? 1 : 100) : data / dataPrev;
                    if (obj.occRatio > 2) {
                        obj.occRatioClass = "muchmore";
                    } else if (obj.occRatio > 1.1) {
                        obj.occRatioClass = "more";
                    } else if (obj.occRatio < 0.5) {
                        obj.occRatioClass = "muchless";
                    } else if (obj.occRatio < 0.9) {
                        obj.occRatioClass = "less";
                    }
                }).error(function (msg) {
                    if (--occCounts === 0) {
                        $rootScope.$broadcast('occ-counted');
                    }
                });
            }).error(function (msg) {
                if (--occCounts === 0) {
                    $rootScope.$broadcast('occ-counted');
                }
            });
        }

        function compareBBox(key) {
            self.bboxChanged = false;
            // compare bounding boxes
            var tileUrl = 'map/density/tile.json?x=0&y=0&z=0&type=TAXON&key=' + key;
            $http.get(CFG.api + tileUrl).success(function (data) {
                var bbox1 = data;
                $http.get(CFG.apiPrev + tileUrl).success(function (data) {
                    if (Math.abs(bbox1.minimumLatitude - data.minimumLatitude) > 0.1
                     || Math.abs(bbox1.minimumLongitude - data.minimumLongitude) > 0.1
                     || Math.abs(bbox1.maximumLatitude - data.maximumLatitude) > 0.1
                     || Math.abs(bbox1.maximumLongitude - data.maximumLongitude) > 0.1
                    ) {
                        self.bboxChanged = true;
                    }
                });
            });
        }

    }])

    // used for the outer layout which includes a search form
    .controller('MainCtrl', ['$scope', '$location', function ($scope, $location) {
        $scope.search = function () {
            $location.path("/search/" + $scope.query);
        };
    }])

    .filter('capitalize', function () {
    return function (x) {
        return x.charAt(0).toUpperCase() + x.slice(1).toLowerCase().replace(/_/g, " ");
    }
})
    .filter('round', function () {
        return function (num, tens) { // first arg is the input, rest are filter params
            return Math.round(num/Math.pow(10, tens))*Math.pow(10, tens);
        }
    })
    .filter('humanSize', function () {
        function trim(num, chars) {
            var x = num + "";
            if (x.length > chars) {
                x = x.substr(0, chars);
                if (x[chars - 1] == '.') {
                    x = x.substr(0, chars - 1);
                }
            }
            return x;
        }

        return function (num) { // first arg is the input, rest are filter params
            if (num > 1000000000) {
                return trim(num / 1000000000, 3) + "B";
            } else if (num > 1000000) {
                return trim(num / 1000000, 3) + "M";
            } else if (num > 1000) {
                return trim(num / 1000, 3) + "K";
            }
            return num;
        }
    })

    .directive('occChange', function () {
        return {
            restrict: "E", scope: {taxon: '='}, template: '<div ng-class="taxon.occRatioClass">{{taxon.occ | humanSize}}</div>'
        };
    })
    .directive('descendantsChange', function () {
        return {
            restrict: "E", scope: {taxon: '='}, template: '<div ng-class="taxon.descendantsRatioClass">{{taxon.descendants | humanSize}}</div>'
        };
    })
    .directive('taxon', function () {
        return {
            restrict: "E",
            scope: {tax: '='},
            template: '<a id="{{tax.name}}" ng-href="#/taxon/{{tax.key}}">{{tax.name}}</a> <small>{{tax.rank}}</small>'
        };
    })
    .directive('usage', function () {
        return {
            restrict: "E",
            scope: {tax: '='},
            template: '<a ng-href="#/taxon/{{tax.key}}">{{tax.scientificName}}</a> <small>{{tax.rank}}</small>'
        };
    })
    .directive("treeMap", ['$rootScope', '$filter', function ($rootScope, $filter) {
        return {
            restrict: "E",
            replace: true,
            scope: {
                tree: '=', event: '@', sizeAttr: '@', classAttr: '@?', width: '=', height: '='
            },
            link: function (scope, elem, attrs) {
                $rootScope.$on(scope.event, function () {
                    if (scope.tree.length > 0) {
                        render();
                    } else {
                        var unwatch = scope.$watch('tree', function (newVal, oldVal) {
                            if (scope.tree.length > 0) {
                                render();
                                // remove the watcher
                                unwatch();
                            }
                        });
                    }
                });
                function render() {
                    console.log("Render tree-map for event " + scope.event);
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
                        .style("height", scope.height + "px");

                    var treemap = d3.layout.treemap()
                        .size([scope.width, scope.height])
                        .sticky(true)
                        .round(false)
                        .value(function (d) {
                            return d[scope.sizeAttr] + 1;
                        });

                    var nodeCl = scope.classAttr ? function (d) {return "node" + (d[scope.classAttr] ? " " + d[scope.classAttr] : "")} : "node";
                    var node = div.datum(data2).selectAll(".node")
                        .data(treemap.nodes)
                        .enter().append("div")
                        .attr("class", nodeCl)
                        .call(position)
                        .text(function (d) {
                            return d.name;
                        })
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
                        .on("click", function (d) {
                            window.location.href = "#/taxon/" + d.key;
                        });
                }

                function position() {
                    this.style("left", function (d) {
                            return d.x + "px";
                        })
                        .style("top", function (d) {
                            return d.y + "px";
                        })
                        .style("width", function (d) {
                            return Math.max(0, d.dx - 1) + "px";
                        })
                        .style("height", function (d) {
                            return Math.max(0, d.dy - 1) + "px";
                        });
                }
            }
        }
    }])
    .directive('bar', function () {
        return {
            restrict: "E", scope: {title: '@', val: '='}, template: '<div><strong>{{title}}</strong>: {{val[0]}} vs {{val[1]}}</div>'
        };
    })
    .directive('bars', function () {
        return {
            restrict: "E",
            scope: {data: '=', width: '@', max: '@'},
            templateUrl:'directives/bars.html'
        };
    })
    .directive('map', ['CFG', '$rootScope', function (CFG, $rootScope) {
        return {
            restrict: "E",
            scope: {mapId:'@', taxonKey: '=', height: '@'},
            link: function (scope, elem, attrs) {
                elem.append('<div style="height:'+scope.height+'px"><div id="'+scope.mapId+'-prev" class="map" style="height:'+scope.height+'px"/> <div id="'+scope.mapId+'" class="map" style="height:'+scope.height+'px"/></div>');

                var prevLink = elem.append('<div id="xxx"></div>');
                var prev = new mapboxgl.Map({
                    container: scope.mapId+'-prev',
                    style: 'mapbox://styles/mapbox/dark-v8',
                    center: [0, 0],
                    zoom: 0,
                    attributionControl: false
                });

                prev.on('style.load', function () {
                    prev.addSource('gbif-prev', {
                        type: 'raster',
                        tiles: [
                            CFG.apiPrev + 'map/density/tile?x={x}&y={y}&z={z}&type=TAXON&resolution=2&key=' + scope.taxonKey
                        ],
                        tileSize: 256
                    });
                    prev.addLayer({
                        id: 'gbif-prev',
                        type: 'raster',
                        source: 'gbif-prev'
                    });
                });
                prev.doubleClickZoom.enable();
                prev.keyboard.enable();

                var next = new mapboxgl.Map({
                    container: scope.mapId,
                    style: 'mapbox://styles/mapbox/dark-v8',
                    center: [0, 0],
                    zoom: 0,
                    attributionControl: false,
                    scrollZoom: true
                });
                next.on('style.load', function () {
                    next.addSource('gbif', {
                        type: 'raster',
                        tiles: [
                            CFG.api + 'map/density/tile?x={x}&y={y}&z={z}&type=TAXON&resolution=2&key=' + scope.taxonKey
                        ],
                        tileSize: 256
                    });
                    next.addLayer({
                        id: 'gbif',
                        type: 'raster',
                        source: 'gbif'
                    });
                });

                var comp = new mapboxgl.Compare(prev, next);
            }
        };
    }])
;

