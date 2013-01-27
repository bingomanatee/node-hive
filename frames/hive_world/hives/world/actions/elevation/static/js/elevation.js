function Elevation($scope, $filter, $compile, $dialog, Worlds, world_id) {

	$scope.canvas_width = 720;

	$scope.world_id = function () {
		return world_id;
	};

	$scope.$watch('world_id()', function (id) {
		if (id) {
			$scope.world = Worlds.get(id, function (world) {
				console.log('world: ', world);
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

	$scope.show_canvas = false;

	$scope.draw = function(){
		$scope.show_canvas = true;
		init_elevation_canvas();
	}

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
	};


	$scope.set_manual_upp = function () {
		var opts = {
			backdrop:      true,
			keyboard:      true,
			backdropClick: true,
			template:      manual_udd_template(),
			controller: 'SMU_Dialog'
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

function SMU_Dialog($scope,dialog){

	$scope.close_smu = function () {
		dialog.close( $scope.manual_units_per_pixel);
	};

	$scope.size_units = function(){
		if (!dialog.ele_scope){
			return 'unit';
		}
		return dialog.ele_scope.world.distance_unit
	}

	$scope.cancel_smu = function () {
		dialog.close(0);
	};

	$scope.width = function(){
		if (!dialog.ele_scope){
			return '--'
		}
		var circ = dialog.ele_scope.circ();
		return Math.round(circ /$scope.manual_units_per_pixel)
	}
}
var world_app = angular.module('world', ['worldServices', 'ui.bootstrap']);

world_app.controller('elevation', Elevation, ['$scope', '$filter', '$compile', '$dialog', 'Worlds', 'world_id']);

