function List($scope, $filter, $compile, $dialog, Worlds) {

	$scope.world_basis = [

		{
			name:  'manual',
			label: 'Manual - type in radius yourself',
			auto:  false,
			km:    0
		},

		{
			name:  'earth',
			label: 'Earth size',
			km:    6731,
			auto:  true
		},

		{
			name:  'moon',
			label: 'Moon size',
			km:    1738,
			auto:  true
		},

		{
			name:  'jupiter',
			label: 'Jupiter size',
			km:    71492,
			auto:  true
		}
	];

	$scope.refresh = function(){
		$scope.worlds = Worlds.query();
	};

	$scope.refresh();

	$scope.get_basis = function (basis) {
		return _.find($scope.world_basis, function (wb) {
			return wb.name == basis;
		})
	}

	$scope.edit = function (world) {
		$scope.edit_world = _.clone(world);
	};

	$scope.edit_elevation = function(world){
		document.location = '/world/edit/elevation/' + world._id;
	};

	$scope.delete_edit_world = function () {

		var title = 'Delete planet ' + $scope.edit_world.name + '?';
		var msg = ' it is peaceful! We have no weapons, you can\'t possibly...';
		var btns = [
			{result: 'no', label: 'My god, what was I thinking?'},
			{result: 'yes', label: 'You May Commence', cssClass: 'btn-danger'}
		];

		$dialog.messageBox(title, msg, btns).open()
			.then(function (result) {
				if (result == 'yes'){
					Worlds.destroy($scope.edit_world, $scope.refresh);
					$scope.close_world_edit();
				} else {
					$scope.cancel_edit_world();
				}
			});
	};

	$scope.update_edit_world = function () {
		Worlds.update($scope.edit_world, $scope.refresh);
		$scope.close_world_edit();
		$scope.edit_world = null;
	};

	$scope.close_world_edit = function () {
		$scope.open_world_edit = false;
		$scope.edit_world = null;
	};

	$scope.cancel_edit_world = function () {
		$scope.close_world_edit();
		$scope.edit_world = null;
	};

	$scope.edit_world_radius_basis_locked = function () {
		if (!$scope.edit_world) {
			return true;
		}
		var rb = $scope.get_basis($scope.edit_world.radius_basis);
		return rb ? rb.auto : false;
	};

	var _new_world_template = {radius_basis: 'manual', radius_unit: 'km', height_unit: 'm', 'distance_unit': 'km'};

	$scope.open_world_new = false;

	$scope.create_world = function () {
		$scope.new_world = _.clone(_new_world_template);
		$scope.open_world_new = true;
	};

	$scope.create_new_world = function () {
		Worlds.add($scope.new_world, $scope.refresh);
		$scope.close_world_new();
		$scope.new_world = _.clone(_new_world_template);
	};

	$scope.close_world_new = function () {
		$scope.open_world_new = false;
		$scope.new_world = _.clone(_new_world_template);
	};

	$scope.cancel_new_world = function () {
		$scope.close_world_new();
		$scope.new_world = _.clone(_new_world_template);
	};

	$scope.new_world_radius_basis_locked = function () {
		if (!$scope.new_world) {
			return true;
		}
		return $scope.get_basis($scope.new_world.radius_basis).auto;
	};

	function _update_new_radius() {
		if (!$scope.new_world) {
			return;

		}
		var rad_basis = $scope.get_basis($scope.new_world.radius_basis);
		if (!rad_basis) {
			return;
		}

		var rad_unit = get_unit($scope.new_world.radius_unit);
		if (!rad_unit) {
			return;
		}

		if (rad_basis.auto) {
			$scope.new_world.radius = parseInt(rad_basis.km / rad_unit.in_km);
		}
	}

	$scope.$watch('new_world.radius_unit', _update_new_radius);
	$scope.$watch('new_world.radius_basis', _update_new_radius);
}

var world_app = angular.module('world', ['worldServices', 'ui.bootstrap']);

world_app.controller('list', List, ['$scope', '$filter', '$compile', '$dialog', 'Worlds']);

