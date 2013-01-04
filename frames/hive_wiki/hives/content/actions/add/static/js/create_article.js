function Page_Editor($scope, $compile, $filter) {
	$scope.content = ' ' + Math.random();
	$scope.rendered = '';

	$scope.nav_buttons = [
		{
			btn_class: 'edit',
			label:     'Edit'
		},
		{
			btn_class: 'side_by_side',
			label:     'Side by Side'
		},
		{
			btn_class: 'rendered',
			label:     'Rendered'
		}
	];

	$scope.current_view = 'edit';

	$scope.toolbar_button_class = function (btn_class) {
		if (btn_class == $scope.current_view) {
			return 'btn active';
		}
		return 'btn';
	};

	$scope.rendered = function () {
		return marked( $scope.content);
	};

	$scope.view_mode = function (btn_class) {
		$scope.current_view = btn_class;
		return false;
	};

	$scope.new_content = function (content) {
		console.log('new content', content);
	}
}

var page_creator_app = angular.module('page_creator', []);
page_creator_app.controller('page_editor', Page_Editor);

