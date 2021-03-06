function Join($scope, $filter, $compile, Members) {

	$scope.member_name = $scope.password = $scope.password2 =  '';

	$scope.add_tag = function () {
		$scope.tags.push($scope.new_tag.toLowerCase());
		$scope.tags = _.sortBy(_.uniq($scope.tags), _.identity);
		$scope.new_tag = '';
	};

	$scope.existing_members = [];

	$scope.join = function () {
		if ($scope.error_message()) {
			return;
		}

		var member = {
			_id: $scope.member_name,
			password: $scope.password,
			email: $scope.email
		};

			Members.add(member, function (member) {
				document.location = "/member/sign_in/" + $scope.member_name;
			}, function (err){
				console.log('e3', err);
				var msg = err.data.error.message;
				if (/there is already a member/.test(msg)){
					$scope.existing_members.push($scope.member_name);
				}
			})
	};

	var sud;

	function _start_update_exists() {
		if (sud) {
			clearTimeout(sud);
		}

		var name = $scope.name;
		var topic = $scope.topic;
		var is_topic = is_topic;

		if (!(name && topic)) {
			return;
		}

		Articles.exists({name: name, topic: topic}, function (err, ex_result) {
			console.log(ex_result);
		})
	}

	$scope.$watch('member_name', _start_update_exists);

	// probably unnecessary
	$scope.member_name_cg = function () {
		var classes = ['control-group'];
		if (!$scope.join_form.member_name.$valid) classes.push('error');
		return classes.join(' ');
	};

	$scope.valid_form = function(){
		if (!join_form.$valid){
			return false;
		}
		return $scope.password == $scope.password2;
	};

	$scope.member_exists_error = function(){
		if ($scope.member_name && _.contains($scope.existing_members, $scope.member_name)){
			return 'There is already a member named ' + $scope.member_name;
		} else {
			return '';
		}
	};

	$scope.error_message = function () {
		if (!$scope.join_form) {
			return '';
		}

		if ($scope.member_exists_error()){
			return $scope.member_exists_error();
		}

		if ($scope.join_form.$error.required) {
			var r = $scope.join_form.$error.required[0];
			return r.$name + ' required';
		}

		if ($scope.join_form.$error.pattern) {
			var p = $scope.join_form.$error.pattern[0];
			return p.$name + ' is badly formatted';
		}

		if ($scope.join_form.$error.minlength) {
			var m = $scope.join_form.$error.minlength[0];
			return m.$name + ' is too short';
		}
		console.log('checking password identity');

		if ($scope.password != $scope.password2){
			console.log('failed');
			return 'passwords do not match';
		} else {
			console.log('succeeded');
		}


		return '';
	};
}

var member_app = angular.module('member', ['memberServices']);

member_app.controller('join', Join, ['$scope', '$filter', '$compile', 'Members']);

