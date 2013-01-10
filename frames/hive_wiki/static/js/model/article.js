angular.module('articleServices', ['ngResource']).factory('Articles',
	function ($resource) {
		return  $resource('/wiki/rest/article/:topic/:name', {'name': '@name', 'topic': '@topic'},
			{
				add:    {method: 'PUT'},
				update: {method: 'POST'},
				exists: {method: 'GET'}
			});
	}).factory('ArticleExists',
	function ($resource) {
		return $resource('/wiki/exists/:topic/:name')
	}
);