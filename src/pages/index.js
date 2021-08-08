import * as React from "react"
import { Link } from "gatsby"

import Layout from "../components/layout"
import Seo from "../components/seo"

// const rotate = (path, deg, x, y) => <g transform={`rotate(${deg} ${x} ${y})`}>{path}</g>;
// const halfturn = (path, x, y) => rotate(path, 180, x, y);

const SVG_DIM = {
	minX: -50,
	maxX: 50,
	minY: -50,
	maxY: 50
}

const T1 = SVG_DIM.maxX - SVG_DIM.minX;
const T2 = SVG_DIM.maxY - SVG_DIM.minY;

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

	const sum_squares = a * a + b * b;
	const new_pos = a * x + b * y + c;
	const ratio = 2 * new_pos / sum_squares
	return [x - a * ratio, y - b * ratio];
}

// Transforms a point such that higher y means upwards, not downwards
const positiveY = (x, y) => {
	return [x, SVG_DIM.maxY - y];
}


const applyTransform = (pathD, transform) => pathD.split(/(?=[LMCHVSQTAZlmchvsqtaz])/).map(d => {
	const getTransformed = (op, path) => {
		switch(op) {
			case "z":
			case "Z":
				return [];
			case "c":
			case "C":
				console.assert(path.length === 6, "C/c command must only have 6 values");
				return transform(path[0], path[1]).concat(transform(path[2], path[3])).concat(transform(path[4], path[5]));
			case "q":
			case "Q":
				console.assert(path.length === 4, "Q/q command must only have 4 values");
				return transform(path[0], path[1]).concat(transform(path[2], path[3]));
			case "a":
			case "A":
				console.assert(path.length === 7, "A/a command must only have 6 values");
				const [rx, ry, x_axis_rot, large_arc, sweep, x, y] = path;
				const [x0, y0] = transform(x, y);
				return [rx, ry, x_axis_rot, large_arc, sweep, x0, y0];
			default:
				console.assert(path.length === 2, "Point commands must only have 2 values");
				return transform(path[0], path[1]);
		}
	}

	const op = d[0];
	let subPath = d.substr(1);
	const points = subPath.replaceAll(",", " ").replaceAll(/\s+/g, ' ').trim().split(" ").map(parseFloat);
	console.log("POINTS", d, points);
	const transformed = getTransformed(op, points);
	const transformedString = transformed.map(p => p.toString()).join(",")
	console.log("TRANSFORMED PATH", transformedString);
	return op + transformedString;
}).join(" ")

const defaultPath = `M20,10l6,-7l3,-1l-1,3l-7,6c1,1,1,2,2,1c0,1,1,2,0,2a1.42,1.42,0,0,1,-1,1a5,5,0,0,0,-2,-3q-0.5,-0.1,-0.5,0.5t-1.5,1.3t-0.8,-0.8t1.3,-1.5t0.5,-0.5a5,5,90,0,0,-3,-2a1.42,1.42,0,0,1,1,-1c0,-1,1,0,2,0c-1,1,0,1,1,2m6,-7l0,2l2,0l-1.8,-0.2l-0.2,-1.8z`
// const defaultPath = `M20,10L26,3L29,2L28,5L21,11C22,12,22,13,23,12C23,13,24,14,23,14A1.42,1.42,0,0,1,22,15A5,5,0,0,0,20,12Q19.5,11.9,19.5,12.5T18,13.8T17.2,13T18.5,11.5T19,11A5,5,90,0,0,16,9A1.42,1.42,0,0,1,17,8C17,7,18,8,19,8C18,9,19,9,20,10M26,3L26,5L28,5L26.2,4.8L26,3Z`

const Motif = ({x = 60, y = 10, group = 'cm_downdiagonal', pathD = defaultPath, fill="grey", stroke="grey", strokeWidth=.5, transforms=[]}) => {
	let paths = [];
	const FILLS = ["red", "orange", "yellow", "green", "blue", "indigo", "violet"]

	// let path = <path d={applyTransform(pathD, positivePath)} fill={fill} strokeWidth={strokeWidth} stroke={stroke}></path>;
	let path = <path d={pathD} fill={fill} strokeWidth={strokeWidth} stroke={stroke}></path>;
	paths = [path].concat(transforms.map((transform, i) => 
		<path d={applyTransform(pathD, transform)} fill={FILLS[i % FILLS.length]} strokeWidth={strokeWidth} stroke={FILLS[i % FILLS.length]} />))

	return <>{paths.map((x, i) => <g key={i} transformID={i}>{x}</g>)}</>;
}

const IndexPage = () => {
	const [x, y] = [60, 10];
	const [h, k] = [0, 0];

	const CX = 30;
	const CY = 20;
	const R = 1;

	// Halfturn about origin
	const halfturnOp = (x, y) => rotate(x, y, h, k, 180);
	// Reflect across y-axis
	const reflectY = (x, y) => reflect(x, y, 1, 0, 0);
	// Reflect across x-axis
	const reflectX = (x, y) => reflect(x, y, 0, 1, 0);
	// Reflect across y = x - 50 -> x - y - 50 = 0
	const reflectYEqX = (x, y) => reflect(x, y, 1, -1, 0);
	// Reflect across y = -x - 50 -> x + y + 50 = 0
	const reflectYEqNegX = (x, y) => reflect(x, y, 1, 1, 0);

	const getLine = (a, b, c) => `M ${SVG_DIM.minX} ${-(a*SVG_DIM.minX + c)/b} L ${SVG_DIM.maxX} ${-(a*SVG_DIM.maxX + c)/b}`;

	return <Layout>
		<Seo title="Home" />
		<h1>Hi people</h1>
		<p>Welcome to your new Gatsby site.</p>
		<p>Now go build something great.</p>

		<svg viewBox={`${SVG_DIM.minX * 3} ${SVG_DIM.minY * 3} ${T1 * 3} ${T2 * 3}`} width="50%">
			<rect height="100" width="100" stroke="grey" strokeWidth=".5" fill="white" x={SVG_DIM.minX} y={SVG_DIM.minY}></rect>
			<g id="Sword">
				<Motif transforms={[
					// (x, y) => rotate(x, y, h, k, 60),
					// (x, y) => rotate(x, y, h, k, 120),
					// (x, y) => rotate(x, y, h, k, 180),
					// (x, y) => rotate(x, y, h, k, 240),
					// (x, y) => rotate(x, y, h, k, 300),
					halfturnOp,
					reflectY,
					reflectX,
					reflectYEqX,
					reflectYEqNegX
				]} strokeWidth={0}/>
			</g>
			<g id="y=x">
				<Motif pathD={getLine(-1, 1, 0)} transforms={[]} />
			</g>
			<g id="y=-x">
				<Motif pathD={getLine(1, 1, 0)} transforms={[]} />
			</g>
			<g id="xaxis">
				<Motif pathD={getLine(0, 1, 0)} transforms={[]} />
			</g>
			<g id="yaxis">
				<Motif pathD={`M ${(SVG_DIM.maxX + SVG_DIM.minX) / 2} ${SVG_DIM.minY} L${(SVG_DIM.maxX + SVG_DIM.minX) / 2} ${SVG_DIM.maxY}`} transforms={[]} />
			</g>
			<g id="circle">
				<Motif pathD={`M29,20A1,1,0,1,0,31,20A1,1,0,1,0,29,20`} strokeWidth={0} transforms={[
					reflectX,
					reflectY,
					reflectYEqX,
					reflectYEqNegX
				]} />
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
