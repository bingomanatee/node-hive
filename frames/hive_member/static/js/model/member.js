angular.module('memberServices', ['ngResource']).factory('Members',
	function ($resource) {
		return  $resource('/member/rest/member/:_id', {'_id': '_id'},
			{
				add:    {method: 'PUT'},
				update: {method: 'POST'},
				exists: {method: 'GET'},
				get: {method: 'GET'}
			});
	});