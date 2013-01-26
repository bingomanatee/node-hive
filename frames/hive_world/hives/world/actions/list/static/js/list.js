function List($scope, $filter, $compile, Worlds) {
	$scope.worlds = Worlds.query();
}

var world_app = angular.module('world', ['worldServices']);

world_app.controller('list', List, ['$scope', '$filter', '$compile', 'Worlds']);

