angular.module('memberServices', ['ngResource']).factory('Members',
	function ($resource) {
		return  $resource('/member/rest/member/:_id', {_id: '@_id'},
			{
				add:    {method: 'PUT'},
				update: {method: 'POST', params: {_id: '@_id'}},
				exists: {method: 'GET'},
				get:    {method: 'GET'},
				query:  {method: 'GET', isArray: true}
			});
	});