var distance_units = [
	{unit: 'km', name: 'Kilometers', in_km: 1},
	{unit: 'm', name: 'Meters', in_km: 1 / 1000},
	{unit: 'cm', name: 'Centimeters', in_km: 1 / (1000 * 100)},
	{unit: 'mi', name: 'Miles', in_km: 1.60934},
	{unit: 'y', name: 'Yards', in_km: 1.60934 / (5280 / 3)},
	{unit: 'f', name: 'feet', in_km: 1.60934 / (5280)},
	{unit: 'in', name: 'Inches', in_km: 1.60934 / (5280 * 12)}
];

function get_unit(u) {
	return _.find(distance_units, function (uu) {
		return uu.unit == u
	});
}