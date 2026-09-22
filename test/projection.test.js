'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createProjection } = require('../lib/projection.js');
const fixture = require('./fixtures/projection.json');
const map = require('../static/europe-map.json');

test('d3 geoConicConformal ile aynı noktaları verir', () => {
	const project = createProjection(fixture.projection);
	for (const { lonlat, xy } of fixture.samples) {
		const [x, y] = project(lonlat);
		assert.ok(Math.abs(x - xy[0]) < 1e-6, `${lonlat} x: ${x} != ${xy[0]}`);
		assert.ok(Math.abs(y - xy[1]) < 1e-6, `${lonlat} y: ${y} != ${xy[1]}`);
	}
});

test('haritadaki İzmir noktası projeksiyonla tutarlı', () => {
	const project = createProjection(map.projection);
	const [x, y] = project([27.1287, 38.4192]);
	assert.ok(Math.abs(x - map.izmir[0]) < 0.1);
	assert.ok(Math.abs(y - map.izmir[1]) < 0.1);
});
