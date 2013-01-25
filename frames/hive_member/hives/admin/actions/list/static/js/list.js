function List($scope, $filter, $compile, Members) {
	$scope.members = Members.query();

	$scope.edit = function(member){
		$scope.edited_member = member;
		if (!member.password){
			member.password = {};
		}
		$scope.open_edit_form = true;
	};

	$scope.cancel_edit = function(){
		$scope.edited_member = false;
		$scope.open_edit_form = false;
	};

	$scope.open_edit_form = false;

	$scope.open = function () {
		$scope.open_edit_form = true;
	};

	$scope.close = function () {
		$scope.closeMsg = 'I was closed at: ' + new Date();
		$scope.shouldBeOpen = false;
	};

	$scope.update_member = function(member){
		if (!member){
			member = $scope.edited_member;
		}
		var member_data = {
			_id: member._id,
			email: member.email
		};

		if (member.password.value){
			if ( $scope.password2 == member.password.value){
				if ( $scope.password2.length >=6){
					member_data.password = {
						value: $scope.password2
					}
				} else {
					return alert('passwords must be at least 6 characters long.');
				}
			} else {
				return alert('your passwords do not match');
			}
		}
		$scope.cancel_edit();

		console.log('sengind update member: ', member_data);
		Members.update(member_data, function(result){
			$scope.members = Members.query();
		})
	}
}

var member_app = angular.module('member', ['memberServices', 'ui.bootstrap']);

member_app.controller('list', List, ['$scope', '$filter', '$compile', 'Members', 'dialog']);

