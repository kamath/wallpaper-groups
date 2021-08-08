import * as React from "react"
import { Link } from "gatsby"

import Layout from "../components/layout"
import Seo from "../components/seo"

// SVG dimensions
const SVG_DIM = {
	minX: -50,
	maxX: 50,
	minY: -50,
	maxY: 50
}

// Translations 1 and 2
const T1 = SVG_DIM.maxX - SVG_DIM.minX;
const T2 = SVG_DIM.maxY - SVG_DIM.minY;

// Colors
const FILLS = ["#DE6B48", "#E5B181", "#F4B9B2", "#DAEDBD", "#7DBBC3", "#553E4E", "#5D576B", "#6CD4FF", "#3F292B", "#2B303A"]

// Scale ViewBox
const scale = 3;

const rad = theta => theta * (Math.PI/180);

// Translate a point (x, y) by (dx, dy) units
const translate = (x, y, relative, dx, dy) => {
	if(relative) return [x, y];
	return [x + dx, y + dy];
}

// Glide reflection by doing translateFunc(reflectFunc(x, y))
// i.e. reflection followed by translation
const glide = (x, y, relative, translateFunc, reflectFunc) => {
	const [xt, yt] = reflectFunc(x, y, relative);
	return translateFunc(xt, yt, relative);
}

// Rotate a point (x, y) about (h, k) by deg degrees
const rotate = (x, y, relative, h, k, deg) => {
	if(relative) [h, k] = [0, 0]
	const theta = rad(deg);
	const r = h * (1 - Math.cos(theta)) + k * Math.sin(theta);
	const s = -h * Math.sin(theta) + k * (1 - Math.cos(theta));
	const x0 = x * Math.cos(theta) - y * Math.sin(theta) + r;
	const y0 = x * Math.sin(theta) + y * Math.cos(theta) + s;
	return [x0, y0];
}

// Reflect a point (x, y) in the line ax + by + c
const reflect = (x, y, relative, a, b, c) => {
	// Equations for normal line
	// const a0 = b;
	// const b0 = -a * b;
	// const c0 = relative ? 0 : -c * a;
	// [a, b, c] = [a0, b0, c0];
	c = relative ? 0 : c;
	const sum_squares = a * a + b * b;
	const new_pos = a * x + b * y + c;
	const ratio = 2 * new_pos / sum_squares
	return [x - a * ratio, y - b * ratio];
}

// Applies a given transform with arguments (x, y, relative) -> [x0, y0] to a path
const applyTransform = (pathD, transform) => pathD.split(/(?=[LMCHVSQTAZlmchvsqtaz])/).map(d => {
	const getTransformed = (op, path) => {
		const relative = op.toLowerCase() === op;
		switch(op) {
			case "z":
			case "Z":
				return [];
			case "c":
			case "C":
				console.assert(path.length === 6, "C/c command must only have 6 values");
				return transform(path[0], path[1], relative).concat(transform(path[2], path[3], relative)).concat(transform(path[4], path[5], relative));
			case "q":
			case "Q":
				console.assert(path.length === 4, "Q/q command must only have 4 values");
				return transform(path[0], path[1], relative).concat(transform(path[2], path[3], relative));
			case "a":
			case "A":
				console.assert(path.length === 7, "A/a command must only have 6 values");
				const [rx, ry, x_axis_rot, large_arc, sweep, x, y] = path;
				const [x0, y0] = transform(x, y, relative);
				return [rx, ry, x_axis_rot, large_arc, sweep, x0, y0];
			default:
				console.assert(path.length === 2, "Point commands must only have 2 values");
				return transform(path[0], path[1], relative);
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

const defaultPath = `M10,25l6,-7l3,-1l-1,3l-7,6c1,1,1,2,2,1c0,1,1,2,0,2a1.42,1.42,0,0,1,-1,1a5,5,0,0,0,-2,-3q-0.5,-0.1,-0.5,0.5t-1.5,1.3t-0.8,-0.8t1.3,-1.5t0.5,-0.5a5,5,90,0,0,-3,-2a1.42,1.42,0,0,1,1,-1c0,-1,1,0,2,0c-1,1,0,1,1,2m6,-7l0,2l2,0l-1.8,-0.2l-0.2,-1.8z`
// const defaultPath = `M20,10L26,3L29,2L28,5L21,11C22,12,22,13,23,12C23,13,24,14,23,14A1.42,1.42,0,0,1,22,15A5,5,0,0,0,20,12Q19.5,11.9,19.5,12.5T18,13.8T17.2,13T18.5,11.5T19,11A5,5,90,0,0,16,9A1.42,1.42,0,0,1,17,8C17,7,18,8,19,8C18,9,19,9,20,10M26,3L26,5L28,5L26.2,4.8L26,3Z`

const Motif = ({group = 'cm_downdiagonal', pathD = defaultPath, fill="grey", stroke="grey", strokeWidth=.5, transforms=[], animate=false}) => {
	// P1 Group (only translations)
	const translations = [
		// Identity
		(x, y, relative) => translate(x, y, relative, 0, 0),
		// Top Left
		(x, y, relative) => translate(x, y, relative, -T1, -T2),
		// Top
		(x, y, relative) => translate(x, y, relative, 0, -T2),
		// Top Right
		(x, y, relative) => translate(x, y, relative, T1, -T2),
		// Right
		(x, y, relative) => translate(x, y, relative, T1, 0),
		// Bottom Right
		(x, y, relative) => translate(x, y, relative, T1, T2),
		// Bottom
		(x, y, relative) => translate(x, y, relative, 0, T2),
		// Bottom Left
		(x, y, relative) => translate(x, y, relative, -T1, T2),
		// Left
		(x, y, relative) => translate(x, y, relative, -T1, 0),
	]

	let tor = [];
	[pathD].concat(transforms.map((transform) => applyTransform(pathD, transform)))
		.forEach(g => translations.forEach(translation => tor.push(applyTransform(g, translation))))
	return tor.map((x, i) => <g key={i} transformID={i}><path d={x} strokeWidth={strokeWidth} stroke={FILLS[i % FILLS.length]}>
		{/* {animate && <animate attributeName="d" values={`${pathD};${x}`} dur="10s" repeatCount="freeze" begin={i == 0 ? "0s" : "1s"}/>} */}
		</path></g>)
}

const IndexPage = () => {
	const [x, y] = [60, 10];
	const [h, k] = [0, 0];

	const CX = 30;
	const CY = 20;
	const R = 1;

	// Halfturn about origin
	const halfturnOp = (x, y, relative) => rotate(x, y, relative, h, k, 180);
	// Reflect across y-axis
	const reflectY = (x, y, relative) => reflect(x, y, relative, 1, 0, 0);
	// Reflect across x-axis
	const reflectX = (x, y, relative) => reflect(x, y, relative, 0, 1, 0);
	// Reflect across y = x - 50 -> x - y - 50 = 0
	const reflectYEqX = (x, y, relative) => reflect(x, y, relative, 1, -1, 0);
	// Reflect across y = -x - 50 -> x + y + 50 = 0
	const reflectYEqNegX = (x, y, relative) => reflect(x, y, relative, 1, 1, 0);

	const glideHorizontal = (x, y, relative) => glide(x, y, relative, (x, y, relative) => translate(x, y, relative, SVG_DIM.maxX - T1, 0), reflectX)
	const glideVertical = (x, y, relative) => glide(x, y, relative, (x, y, relative) => translate(x, y, relative, 0, SVG_DIM.maxY - T2), reflectY)
	const glideHalfVert = (x, y, relative) => glide(x, y, relative, (x, y, relative) => translate(x, y, relative, 0, SVG_DIM.maxY - T2), 
			(x, y, relative) => reflect(x, y, relative, 1, 0, -T2/4))

	const getLine = (a, b, c, xStart=SVG_DIM.minX, xFin=SVG_DIM.maxX) => `M ${xStart} ${-(a*xStart + c)/b} L ${xFin} ${-(a*xFin + c)/b}`;

	const groups = {
		p1: [],
		p2: [
			(x, y, relative) => rotate(x, y, relative, -T1/2, -T2/2, 180), // Top Left
			(x, y, relative) => rotate(x, y, relative, 0, -T2/2, 180), // Top
			(x, y, relative) => rotate(x, y, relative, T1/2, -T2/2, 180), // Top Right
			(x, y, relative) => rotate(x, y, relative, -T1/2, 0, 180), // Left
			(x, y, relative) => rotate(x, y, relative, 0, 0, 180), // Center
			(x, y, relative) => rotate(x, y, relative, T1/2, 0, 180), // Right
			(x, y, relative) => rotate(x, y, relative, -T1/2, T2/2, 180), // Bottom Left
			(x, y, relative) => rotate(x, y, relative, 0, T2/2, 180), // Bottom
			(x, y, relative) => rotate(x, y, relative, T1/2, T2/2, 180), // Bottom Right
		],
		pm: [
			(x, y, relative) => reflect(x, y, relative, 0, 1, -T2/2), // Top
			(x, y, relative) => reflect(x, y, relative, 0, 1, 0), // Center
			(x, y, relative) => reflect(x, y, relative, 0, 1, T2/2), // Bottom
		],
		// pm_horizontal: [reflectX],
		// pm_vertical: [reflectY],
		// pg_horizontal: [glideHorizontal],
		// pg_vertical: [glideVertical],
		pg: [
			(x, y, relative) => glide(x, y, relative, 
				(x, y, relative) => translate(x, y, relative, SVG_DIM.maxX - T1, SVG_DIM.maxY - T2), 
				(x, y, relative) => reflect(x, y, relative, 0, 1, -T2/2)), // Top
			(x, y, relative) => glide(x, y, relative, 
				(x, y, relative) => translate(x, y, relative, SVG_DIM.maxX - T1, SVG_DIM.maxY - T2), 
				(x, y, relative) => reflect(x, y, relative, 0, 1, 0)), // Center
			(x, y, relative) => glide(x, y, relative, 
				(x, y, relative) => translate(x, y, relative, SVG_DIM.maxX - T1, SVG_DIM.maxY - T2), 
				(x, y, relative) => reflect(x, y, relative, 0, 1, T2/2)) // Bottom
		],
		cm: [
			(x, y, relative) => glide(x, y, relative, 
				(x, y, relative) => translate(x, y, relative, SVG_DIM.maxX - T1, SVG_DIM.maxY - T2), 
				(x, y, relative) => reflect(x, y, relative, 0, 1, T2/4)), // Top middle
			(x, y, relative) => reflect(x, y, relative, 0, 1, 0), // Middle
			(x, y, relative) => translate(x, y, relative, SVG_DIM.maxX - T1, 0), // Middle translation
			(x, y, relative) => glide(x, y, relative, 
					(x, y, relative) => translate(x, y, relative, SVG_DIM.maxX - T1, SVG_DIM.maxY - T2), 
					(x, y, relative) => reflect(x, y, relative, 0, 1, -T2/4)), // Bottom middle
		],
		pmm: [
			(x, y, relative) => rotate(x, y, relative, -T1/2, -T2/2, 180), // Top Left
			(x, y, relative) => rotate(x, y, relative, 0, -T2/2, 180), // Top
			(x, y, relative) => rotate(x, y, relative, T1/2, -T2/2, 180), // Top Right
			(x, y, relative) => rotate(x, y, relative, -T1/2, 0, 180), // Left
			(x, y, relative) => rotate(x, y, relative, 0, 0, 180), // Center
			(x, y, relative) => rotate(x, y, relative, T1/2, 0, 180), // Right
			(x, y, relative) => rotate(x, y, relative, -T1/2, T2/2, 180), // Bottom Left
			(x, y, relative) => rotate(x, y, relative, 0, T2/2, 180), // Bottom
			(x, y, relative) => rotate(x, y, relative, T1/2, T2/2, 180), // Bottom Right
			(x, y, relative) => reflect(x, y, relative, 0, 1, -T2/2), // Top
			(x, y, relative) => reflect(x, y, relative, 0, 1, 0), // Center horizontal
			(x, y, relative) => reflect(x, y, relative, 0, 1, T2/2), // Bottom
			(x, y, relative) => reflect(x, y, relative, 1, 0, -T1/2), // Left
			(x, y, relative) => reflect(x, y, relative, 1, 0, 0), // Center vertical
			(x, y, relative) => reflect(x, y, relative, 1, 0, T1/2), // Right
		],
		pmg: [
			(x, y, relative) => rotate(x, y, relative, -T1/2, -T2/2, 180), // Top Left
			(x, y, relative) => rotate(x, y, relative, 0, -T2/2, 180), // Top
			(x, y, relative) => rotate(x, y, relative, T1/2, -T2/2, 180), // Top Right
			(x, y, relative) => rotate(x, y, relative, -T1/2, 0, 180), // Left
			(x, y, relative) => rotate(x, y, relative, 0, 0, 180), // Center
			(x, y, relative) => rotate(x, y, relative, T1/2, 0, 180), // Right
			(x, y, relative) => rotate(x, y, relative, -T1/2, T2/2, 180), // Bottom Left
			(x, y, relative) => rotate(x, y, relative, 0, T2/2, 180), // Bottom
			(x, y, relative) => rotate(x, y, relative, T1/2, T2/2, 180), // Bottom Right
			// (x, y, relative) => reflect(x, y, relative, 0, 1, -T2/4), // Top Half
			(x, y, relative) => reflect(x, y, relative, 0, 1, T2/4), // Bottom Half
		],
	}

	const wip = "pmg";


	return <Layout>
		<Seo title="Home" />
		<h1>Hi people</h1>
		<p>Welcome to your new Gatsby site.</p>
		<p>Now go build something great.</p>

		<svg viewBox={`${SVG_DIM.minX * scale} ${SVG_DIM.minY * scale} ${T1 * scale} ${T2 * scale}`} width="50%">
			{/* Top Left */}
			<rect height="100" width="100" stroke="grey" strokeWidth=".5" fill="white" x={SVG_DIM.minX * 3} y={SVG_DIM.minY * 3}></rect>
			{/* Left */}
			<rect height="100" width="100" stroke="grey" strokeWidth=".5" fill="white" x={SVG_DIM.minX * 3} y={SVG_DIM.minY}></rect>
			{/* Bottom Left */}
			<rect height="100" width="100" stroke="grey" strokeWidth=".5" fill="white" x={SVG_DIM.minX * 3} y={SVG_DIM.minY * -1}></rect>
			{/* Bottom */}
			<rect height="100" width="100" stroke="grey" strokeWidth=".5" fill="white" x={SVG_DIM.minX} y={SVG_DIM.minY * -1}></rect>
			{/* Bottom Right */}
			<rect height="100" width="100" stroke="grey" strokeWidth=".5" fill="white" x={SVG_DIM.minX * -1} y={SVG_DIM.minY * -1}></rect>
			{/* Right */}
			<rect height="100" width="100" stroke="grey" strokeWidth=".5" fill="white" x={SVG_DIM.minX * -1} y={SVG_DIM.minY}></rect>
			{/* Top Right */}
			<rect height="100" width="100" stroke="grey" strokeWidth=".5" fill="white" x={SVG_DIM.minX * -1} y={SVG_DIM.minY * 3}></rect>
			{/* Top */}
			<rect height="100" width="100" stroke="grey" strokeWidth=".5" fill="white" x={SVG_DIM.minX} y={SVG_DIM.minY * 3}></rect>

			<rect height="100" width="100" stroke="grey" strokeWidth=".5" fill="white" x={SVG_DIM.minX} y={SVG_DIM.minY}></rect>
			<g id="Sword">
				<Motif transforms={groups[wip]} strokeWidth={0} animate={true}/>
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
			<g id="xaxisTopHalf">
				<Motif pathD={getLine(0, 1, T1/4)} transforms={[]} />
			</g>
			<g id="xaxisBottomHalf">
				<Motif pathD={getLine(0, 1, -T1/4)} transforms={[]} />
			</g>
			<g id="yaxis">
				<Motif pathD={`M ${(SVG_DIM.maxX + SVG_DIM.minX) / 2} ${SVG_DIM.minY} L${(SVG_DIM.maxX + SVG_DIM.minX) / 2} ${SVG_DIM.maxY}`} transforms={[]} />
			</g>
			<g id="yaxisLeftHalf">
				<Motif pathD={`M ${-T1/4} ${SVG_DIM.minY} L${-T1/4} ${SVG_DIM.maxY}`} transforms={[]} />
			</g>
			<g id="yaxisRightHalf">
				<Motif pathD={`M ${T1/4} ${SVG_DIM.minY} L${T1/4} ${SVG_DIM.maxY}`} transforms={[]} />
			</g>
		</svg>
	
		<p>
			<Link to="/page-2/">Go to page 2</Link> <br />
			<Link to="/using-typescript/">Go to "Using TypeScript"</Link>
		</p>
	</Layout>
}

export default IndexPage
