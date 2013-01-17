function Page_Editor($scope, $filter, $compile, Articles, is_topic) {

	$scope.content = ' ' + Math.random();
	$scope.name = '';
	$scope.rendered = '';
	$scope.tags = [];
	$scope.new_tag = '';
	$scope.is_topic = is_topic;

	$scope.add_tag = function () {
		$scope.tags.push($scope.new_tag.toLowerCase());
		$scope.tags = _.sortBy(_.uniq($scope.tags), _.identity);
		$scope.new_tag = '';
	};

	$scope.save = function () {
		var article = {
			title:    $scope.title,
			name:     $scope.name,
			intro:    $scope.intro,
			tags:     $scope.tags,
			content:  $scope.content,
			topic:    $scope.topic,
			is_topic: !!$scope.is_topic
		};

		if ($scope.is_topic) {
			article.topic = $scope.name;
		}

		Articles.add(article, function () {
			document.location = "/wiki/articles";
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

	$scope.generate_name = function(){
		$scope.name = $scope.title.toLowerCase().replace(/[^\w]+/g, '_').replace(/[_]+/g, '_');
	}

	$scope.$watch('name', _start_update_exists);

	$scope.$watch('topic', _start_update_exists);

	$scope.$watch('is_topic', _start_update_exists);

	$scope.content_min_length = 10;

	$scope.name_cg = function () {
		var classes = ['control-group'];
		if (!$scope.prelim.name.$valid) classes.push('error');
		return classes.join(' ');
	};

	$scope.error_message = function () {
		if (!$scope.prelim) {
			return '';
		}
		if ($scope.prelim.$valid) {
			return '';
		}

		if ($scope.prelim.$error.required) {
			var r = $scope.prelim.$error.required[0];
			return r.$name + ' required';
		}

		if ($scope.prelim.$error.pattern) {
			var p = $scope.prelim.$error.pattern[0];
			return p.$name + ' is badly formatted';
		}

		if ($scope.prelim.$error.minlength) {
			var m = $scope.prelim.$error.minlength[0];
			return m.$name + ' is too short';
		}

		return '';
	};

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
			return 'active';
		}
		return '';
	};

	$scope.rendered = function () {
		return $scope.content ? marked($scope.content) : '';
	};

	$scope.content_class = function () {
		if ($scope.current_view == 'side_by_side') {
			return 'span6'
		}
		return 'span12'
	};

	$scope.rendered_class = $scope.content_class;

	$scope.view_mode = function (btn_class) {
		$scope.current_view = btn_class;
		return false;
	};

	$scope.new_content = function (content) {
		console.log('new content', content);
	}
}

var page_creator_app = angular.module('page_creator', ['articleServices']);

page_creator_app.controller('page_editor', Page_Editor, ['$scope', '$filter', '$compile', 'Articles', 'is_topic']);

