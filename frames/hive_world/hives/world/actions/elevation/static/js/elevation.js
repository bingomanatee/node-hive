function Elevation($scope, $filter, $compile, $dialog, Worlds, world_id) {

	

	$scope.canvas_width = 720;

	$scope.world_id = function () {
		return world_id;
	};

	$scope.$watch('world_id()', function (id) {
		if (id) {
			$scope.world = Worlds.get(id, function (world) {
				
				$scope.$parent.$emit('world', world)
			});
		}
	});

	$scope.circ = function () {
		if ((!$scope.canvas_width) || (!$scope.world)) {
			return 0;
		}
		return Math.PI * $scope.world.radius;
	};

	$scope.units_per_pixel = function () {
		if ((!$scope.canvas_width) || (!$scope.world)) {
			return '--';
		}

		var units_per_pixel = $scope.circ() / $scope.canvas_width;
		return units_per_pixel;
	}

	$scope.half = function (v) {
		return Math.floor(v / 2)
	};

	$scope.show_canvas = false;

	$scope.draw = function () {
		$scope.show_canvas = true;
		init_elevation_dist_canvas();
		
		$scope.$parent.$emit('graph_ele', true);
	};

	// Inlined template for demo
	function manual_udd_template() {
		return '<div class="modal-header">' +
			'<h1>Set ' + $scope.world.distance_unit + ' per pixel</h1>' +
			'</div>' +
			'<div class="modal-body">' +
			'<p>Set the number of {{size_units()}} per pixel: <input type="number" ng-model="manual_units_per_pixel" /></p>' +
			'<p>(resulting canvas width: {{width() | number: 0 }}</p>' +
			'<p><small>Will be approximated to nearest fraction resulting in whole-pixel size</small></p>' +
			'</div>' +
			'<div class="modal-footer">' +
			'<button ng-click="cancel_smu()" class="btn" >Cancel</button>' +
			'<button ng-click="close_smu(result)" class="btn btn-primary" >Set</button>' +
			'</div>';
	}

	$scope.set_manual_upp = function () {
		var opts = {
			backdrop:      true,
			keyboard:      true,
			backdropClick: true,
			template:      manual_udd_template(),
			controller:    'SMU_Dialog'
		};

		$scope.manual_units_per_pixel = $scope.units_per_pixel();

		$scope.smu_dialog = $dialog.dialog(opts);
		$scope.smu_dialog.ele_scope = $scope;
		$scope.smu_dialog.open().then(function (result) {
			if (result) {
				alert('dialog closed with result: ' + result);
				$scope.canvas_width = Math.ceil($scope.circ() / result);
			}
		});
	};

}

function SMU_Dialog($scope, dialog) {

	$scope.close_smu = function () {
		dialog.close($scope.manual_units_per_pixel);
	};

	$scope.size_units = function () {
		if (!dialog.ele_scope) {
			return 'unit';
		}
		return dialog.ele_scope.world.distance_unit
	}

	$scope.cancel_smu = function () {
		dialog.close(0);
	};

	$scope.width = function () {
		if (!dialog.ele_scope) {
			return '--'
		}
		var circ = dialog.ele_scope.circ();
		return Math.round(circ / $scope.manual_units_per_pixel)
	}
}
var world_app = angular.module('world', ['worldServices', 'ui.bootstrap']);

function Ele_Dist($scope, $filter, $compile, $dialog, Worlds) {

	

	$scope.show_graph = false;
	$scope.range_items = [
		{grey: 255, red: 204, green: 245, blue: 255, height: 5000},
		{grey: 204, red: 102, green: 85, blue: 75, height: 3000},
		{grey: 175, red: 127, green: 115, blue: 0, height: 2200},
		{grey: 150, red: 51, green: 125, blue: 25, height: 1800},
		{grey: 135, red: 0, green: 204, blue: 51, height: 1200}
	];

	$scope.sea_level = { grey: 128, red: 0, green: 128, blue: 255, height: 800};
	$scope.sea_floor = { grey: 0, red: 0, green: 0, blue: 0, height: 0};
	$scope.beach = { grey: 51, red: 255, green: 204, blue: 128, height: 800};

	$scope.$watch('sea_level.grey', function () {
		$scope.beach.grey = $scope.sea_level.grey + 1;
		$scope.beach.height = $scope.sea_level.height + 1;
		_send_elevations();
	});

	$scope.$parent.$on('world', function (event, world) {
		$scope.distance_unit = get_unit(world.distance_unit);
		$scope.height_unit = get_unit(world.height_unit);
		$scope.world = world;
		$scope.range_items[0].height = parseInt(8.5 / $scope.height_unit.in_km);
	});

	$scope.$parent.$on('graph_ele', function (event, value) {
		$scope.show_graph = value;
		init_elevation_canvas();
		_send_elevations();
	});

	$scope.elevations = function () {

		var out = $scope.range_items.slice(0);
		out.push($scope.sea_level);
		out.push($scope.sea_floor);
		out.push($scope.beach);
		out = _.sortBy(out, 'grey');
		return out;
	};
	var li;

	setInterval(function () {
		if (!li) {
			li = JSON.stringify($scope.elevations());
		} else {
			var li2 = JSON.stringify($scope.elevations());
			if (li2 != li) {
				li = li2;
				_send_elevations();
			}
		}

	}, 1500);

	function _send_elevations() {
		var elevations = $scope.elevations();
		
		update_elevation_colors(elevations);
	}
}
world_app.controller('elevation_dist', Ele_Dist, ['$scope', '$filter', '$compile', '$dialog', 'Worlds', 'world_id']);

world_app.controller('elevation', Elevation, ['$scope', '$filter', '$compile', '$dialog', 'Worlds']);

