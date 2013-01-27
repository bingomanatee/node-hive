angular.module('worldServices', ['ngResource']).factory('Worlds',
	function ($resource) {
		return  $resource('/hive_world/rest/world/:_id', {_id: '@_id'},
			{
				add:    {method: 'PUT'},
				update: {method: 'POST', params: {_id: '@_id'}},
				get:    {method: 'GET', params: {_id: '@_id'}},
				query:  {method: 'GET', isArray: true},
				destroy: {method: 'DELETE'}
			});
	});