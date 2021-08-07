import * as React from "react"
import { Link } from "gatsby"

import Layout from "../components/layout"
import Seo from "../components/seo"

// const rotate = (path, deg, x, y) => <g transform={`rotate(${deg} ${x} ${y})`}>{path}</g>;
// const halfturn = (path, x, y) => rotate(path, 180, x, y);

const SVG_WIDTH = 100;
const SVG_HEIGHT = 100;

const rad = theta => theta * (Math.PI/180);

// Rotate a point (x, y) about (h, k) by deg degrees
const rotate = (x, y, h, k, deg) => {
	const theta = rad(deg);
	const r = h * (1 - Math.cos(theta)) + k * Math.sin(theta);
	const s = -h * Math.sin(theta) + k * (1 - Math.cos(theta));
	const x0 = x * Math.cos(theta) - y * Math.sin(theta) + r;
	const y0 = x * Math.sin(theta) + y * Math.cos(theta) + s;
	return [x0, y0];
}

// Reflect a point (x, y) in the line ax + by + c
const reflect = (x, y, a, b, c) => {
	y = y;
	c -= 50;

	const sum_squares = a * a + b * b;
	const new_pos = a * x + b * y + c;
	const ratio = 2 * new_pos / sum_squares
	return [x - a * ratio, y - b * ratio];
}

// Transforms a point such that higher y means upwards, not downwards
const positiveY = (x, y) => {
	return [x, SVG_HEIGHT - y];
}

// Rotates a path operation about (h, k) by deg degrees
// op must be one of "m", "c", "h", etc. (SVG Path commands)
// path must be a list of floats corresponding to the arguments to the argument
// Returns a list of floats, the rotated points
const rotatePath = (op, path, h, k, deg) => {
	[h, k] = (op === op.toLowerCase()) ? [0, 0] : [h, k];
	switch(op) {
		case "z":
		case "Z":
			return [];
		case "c":
		case "C":
			console.assert(path.length === 6, "C/c command must only have 6 values");
			return rotate(path[0], path[1], h, k, deg).concat(rotate(path[2], path[3], h, k, deg)).concat(rotate(path[4], path[5], h, k, deg));
		case "q":
		case "Q":
			console.assert(path.length === 4, "Q/q command must only have 4 values");
			return rotate(path[0], path[1], h, k, deg).concat(rotate(path[2], path[3], h, k, deg));
		case "a":
		case "A":
			console.assert(path.length === 7, "A/a command must only have 6 values");
			const [rx, ry, x_axis_rot, large_arc, sweep, x, y] = path;
			const [x0, y0] = rotate(x, y, h, k, deg);
			const deg0 = (x_axis_rot + deg) % 360;
			return [rx, ry, deg0, large_arc, sweep, x0, y0];
		default:
			console.assert(path.length === 2, "Point commands must only have 2 values");
			return rotate(path[0], path[1], h, k, deg);
	}
}

// Reflects a path in the line ax + by + c
// op must be one of "m", "c", "h", etc. (SVG Path commands)
// path must be a list of floats corresponding to the arguments to the argument
// Returns a list of floats, the reflected points
const reflectPath = (op, path, a, b, c) => {
	switch(op) {
		case "z":
		case "Z":
			return [];
		case "c":
		case "C":
			console.assert(path.length === 6, "C/c command must only have 6 values");
			return reflect(path[0], path[1], a, b, c).concat(reflect(path[2], path[3], a, b, c)).concat(reflect(path[4], path[5], a, b, c));
		case "q":
		case "Q":
			console.assert(path.length === 4, "Q/q command must only have 4 values");
			return reflect(path[0], path[1], a, b, c).concat(reflect(path[2], path[3], a, b, c));
		case "a":
		case "A":
			console.assert(path.length === 7, "A/a command must only have 6 values");
			const [rx, ry, x_axis_rot, large_arc, sweep, x, y] = path;
			const [x0, y0] = reflect(x, y, a, b, c);
			return [rx, ry, x_axis_rot, large_arc, sweep, x0, y0];
		default:
			console.assert(path.length === 2, "Point commands must only have 2 values");
			return reflect(path[0], path[1], a, b, c);
	}
}

// Transforms a path such that positive y means go upwards, not downwards
// op must be one of "m", "c", "h", etc. (SVG Path commands)
// path must be a list of floats corresponding to the arguments to the argument
// Returns a list of floats, the transformed points
const positivePath = (op, path) => {
	switch(op) {
		case "z":
		case "Z":
			return [];
		case "c":
		case "C":
			console.assert(path.length === 6, "C/c command must only have 6 values");
			return positiveY(path[0], path[1]).concat(positiveY(path[2], path[3])).concat(positiveY(path[4], path[5]));
		case "q":
		case "Q":
			console.assert(path.length === 4, "Q/q command must only have 4 values");
			return positiveY(path[0], path[1]).concat(positiveY(path[2], path[3]));
		case "a":
		case "A":
			console.assert(path.length === 7, "A/a command must only have 6 values");
			const [rx, ry, x_axis_rot, large_arc, sweep, x, y] = path;
			const [x0, y0] = positiveY(x, y);
			return [rx, ry, x_axis_rot, large_arc, sweep, x0, y0];
		default:
			console.assert(path.length === 2, "Point commands must only have 2 values");
			return positiveY(path[0], path[1]);
	}
}


const applyTransform = (pathD, transform) => pathD.split(/(?=[LMCHVSQTAZlmchvsqtaz])/).map(d => {
	const op = d[0];
	let subPath = d.substr(1);
	const points = subPath.replaceAll(",", " ").replaceAll(/\s+/g, ' ').trim().split(" ").map(parseFloat);
	console.log("POINTS", d, points);
	const transformed = transform(op, points);
	const transformedString = transformed.map(p => p.toString()).join(",")
	console.log("TRANSFORMED PATH", transformedString);
	return op + transformedString;
}).join(" ")

// const defaultPath = `M${x},${y}l6,-7l3,-1l-1,3l-7,6c1,1,1,2,2,1c0,1,1,2,0,2a1.42,1.42,0,0,1,-1,1a5,5,0,0,0,-2,-3q-0.5,-0.1,-0.5,0.5t-1.5,1.3t-0.8,-0.8t1.3,-1.5t0.5,-0.5a5,5,90,0,0,-3,-2a1.42,1.42,0,0,1,1,-1c0,-1,1,0,2,0c-1,1,0,1,1,2m6,-7l0,2l2,0l-1.8,-0.2l-0.2,-1.8z`
const defaultPath = `M60,10L66,3L69,2L68,5L61,11C62,12,62,13,63,12C63,13,64,14,63,14A1.42,1.42,0,0,1,62,15A5,5,0,0,0,60,12Q59.5,11.9,59.5,12.5T58,13.8T57.2,13T58.5,11.5T59,11A5,5,90,0,0,56,9A1.42,1.42,0,0,1,57,8C57,7,58,8,59,8C58,9,59,9,60,10M66,3L66,5L68,5L66.2,4.8L66,3Z`

const Motif = ({x = 60, y = 10, group = 'cm_downdiagonal', pathD = defaultPath, fill="grey", stroke="grey", strokeWidth=.5, transforms=[]}) => {
	let paths = [];
	const FILLS = ["black", "blue", "green", "orange", "yellow", "grey"]

	let path = <path d={applyTransform(pathD, positivePath)} fill={fill} strokeWidth={strokeWidth} stroke={stroke}></path>;
	paths = [path].concat(transforms.map((transform, i) => 
		<path d={applyTransform(pathD, transform)} fill={FILLS[i % FILLS.length]} strokeWidth={strokeWidth} stroke={FILLS[i % FILLS.length]} />))

	console.log("PATH D", pathD.split(/(?=[LMCHVSQTAZlmchvsqtaz])/))

	// newPath = applyTransform(pathD, (op, path) => rotatePath(op, path, x, y, 180))
	// console.log("ROTATED D", newPath);
	// paths.push(<path x={x} y={y} d={newPath}></path>);

	return <>{paths.map((x, i) => <g key={i} transformID={i}>{x}</g>)}</>;

	// if(group === 'p2') paths.push(halfturn(path, 50, 50))
	// if(group === 'pm_vertical') paths.push(<g transform="translate(100 0) scale(-1 1)">{path}</g>)
	// if(group === 'pm_horizontal') paths.push(<g transform="translate(0 100) scale(1 -1)">{path}</g>)
	// if(group === 'reflect_xy') paths.push(<g transform={`translate(100 100) scale(-1 -1)`}>{path}</g>)
	// if(group === 'cm_downdiagonal') {
	// 	paths.push(<g transform={`translate(100 100) scale(-1 -1)`}>{path}</g >)
	// }

	// if(group === 'pg_vertical') 
	// 	for(let i = -100; i <= 150; i += 50) 
	// 		paths.push(<g transform={`translate(${(i / 50 % 2 === 0) ? 0 : 100} ${50 * (i / 50)}) scale(${Math.pow(-1, i / 50)} 1)`}>{path}</g>)
	// if(group === 'pg_horizontal') 
	// 	for(let i = -100; i <= 150; i += 50) 
	// 		paths.push(<g transform={`translate(${50 * (i / 50)} ${(i / 50 % 2 === 0) ? 0 : 100}) scale(1 ${Math.pow(-1, i / 50)})`}>{path}</g>)
	// if(group === 'cm_updiagonal') 
	// 	for(let i = -100; i <= 150; i += 50) 
	// 		paths.push(<g transform={`translate(${(i / 50 % 2 === 0) ? 0 : 100} ${(i / 50 % 2 === 0) ? 0 : 100}) scale(${Math.pow(-1, i / 50)} ${Math.pow(-1, i / 50)})`}>{path}</g>)
	// const tor = <>{paths.map((x, i) => <g key={i} fill={FILLS[i % FILLS.length]}>{x}</g>)}</>;
	// console.log("v1", group)

	// return tor;
}

const IndexPage = () => {
	const [x, y] = [60, 10];
	const [h, k] = [50, 50];

	const CX = 30;
	const CY = 20;
	const R = 1;

	// Halfturn about origin
	const halfturnOp = (op, path) => rotatePath(op, path, h, k, 180);
	// Reflect across y-axis
	const reflectY = (op, path) => reflectPath(op, path, 1, 0, 0);
	// Reflect across x-axis
	const reflectX = (op, path) => reflectPath(op, path, 0, 1, 0);
	// Reflect across y = x - 50 -> x - y - 50 = 0
	const reflectYEqX = (op, path) => reflectPath(op, path, 1, -1, 0);
	// Reflect across y = -x - 50 -> x + y + 50 = 0
	const reflectYEqNegX = (op, path) => reflectPath(op, path, 1, 1, 0);
	// Make sure y is positive
	const invertY = (op, path) => positivePath(op, path);

	const getLine = (a, b, c) => `M 0 ${-(a*0 + c)/b} L ${SVG_WIDTH} ${-(a*SVG_WIDTH + c)/b}`;

	return <Layout>
		<Seo title="Home" />
		<h1>Hi people</h1>
		<p>Welcome to your new Gatsby site.</p>
		<p>Now go build something great.</p>

		<svg viewBox="0 0 100 100" width="50%">
			<rect height="100" width="100" stroke="grey" strokeWidth=".5" fill="white"></rect>
			{/* <line x1="50" y1="0" x2="50" y2="100" stroke="grey" strokeWidth=".5" />
			<line x1="0" y1="50" x2="100" y2="50" stroke="grey" strokeWidth=".5" />
			<line x1="0" y1="0" x2="100" y2="100" stroke="grey" strokeWidth=".5" />
			<line x1="0" y1="100" x2="100" y2="0" stroke="grey" strokeWidth=".5" /> */}
			<g id="Sword">
				<Motif transforms={[
					// halfturnOp,
					reflectY,
					// reflectX,
					// reflectYEqNegX
				]} strokeWidth={0}/>
			</g>
			<g id="y=x">
				<Motif pathD={getLine(-1, 1, 0)} transforms={[]} />
			</g>
			<g id="y=-x">
				<Motif pathD={getLine(1, 1, -100)} transforms={[]} />
			</g>
			<g id="circle">
				<Motif pathD={`M29,20A1,1,0,1,0,31,20A1,1,0,1,0,29,20`} strokeWidth={0} transforms={[reflectYEqNegX]} />
			</g>
			<circle cx={h} cy={k} r={1} fill="red" />
		</svg>
	
		<p>
			<Link to="/page-2/">Go to page 2</Link> <br />
			<Link to="/using-typescript/">Go to "Using TypeScript"</Link>
		</p>
	</Layout>
}

export default IndexPage
