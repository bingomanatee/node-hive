function Page_List($scope, $filter, $compile, Articles, Topics, topic) {
	$scope.topic = topic;

	$scope.filter_tags = function (tag) {
		$scope.tag_filter = tag;
	};

	function _set_tag_filter(){
		$scope.article_filter = ($scope.tag_filter) ? {tags: $scope.tag_filter} : null;
	}

	$scope.article_filter = null;
	$scope.tag_filter = $scope.search = null;

	$scope.$watch('tag_filter', _set_tag_filter);
	$scope.$watch('search', _set_tag_filter);

	Topics.get({topic: topic}, function (data) {
		console.log('topic data: ', data);
		$scope.topic_data = data;
	});
}

var topic_app = angular.module('topic', ['articleServices']);

topic_app.controller('page_list', Page_List, ['$scope', '$filter', '$compile', 'Articles', 'Topics', 'topic']);

