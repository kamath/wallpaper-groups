import * as React from "react"
import { useState } from "react";
import { Link } from "gatsby"
import { Select, InputNumber } from 'antd';

import Layout from "../components/layout"
import Seo from "../components/seo"

const { Option } = Select;

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

// Chains transformations together of the form ([x, y, relative]) => [x0, y0]
const chain = (transformations, [x, y, relative], i=0) => {
	if(i >= transformations.length) return [x, y];
	const [x0, y0] = transformations[i]([x, y, relative]);
	return chain(transformations, [x0, y0, relative], i+1);
}

// Translate a point [x, y, relative?] by (dx, dy) units
const translate = (pos, dx, dy) => {
	const [x, y, relative] = pos
	if(relative) return [x, y];
	return [x + dx, y + dy];
}

// Glide reflection by doing translateFunc(reflectFunc(x, y))
// i.e. reflection followed by translation
const glide = (pos, translateFunc, reflectFunc) => {
	const [x, y, relative] = pos;
	const [xt, yt] = reflectFunc(pos);
	return translateFunc([xt, yt, relative]);
}

// Rotate a point [x, y, relative] about (h, k) by deg degrees
const rotate = (pos, h, k, deg) => {
	const [x, y, relative] = pos;
	if(relative) [h, k] = [0, 0]
	const theta = rad(deg);
	const r = h * (1 - Math.cos(theta)) + k * Math.sin(theta);
	const s = -h * Math.sin(theta) + k * (1 - Math.cos(theta));
	const x0 = x * Math.cos(theta) - y * Math.sin(theta) + r;
	const y0 = x * Math.sin(theta) + y * Math.cos(theta) + s;
	return [x0, y0];
}

// Reflect a point (x, y) in the line ax + by + c
const reflect = (pos, a, b, c) => {
	const [x, y, relative] = pos;
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
				return transform([path[0], path[1], relative]).concat(transform([path[2], path[3], relative])).concat(transform([path[4], path[5], relative]));
			case "q":
			case "Q":
				console.assert(path.length === 4, "Q/q command must only have 4 values");
				return transform([path[0], path[1], relative]).concat(transform([path[2], path[3], relative]));
			case "a":
			case "A":
				console.assert(path.length === 7, "A/a command must only have 6 values");
				const [rx, ry, x_axis_rot, large_arc, sweep, x, y] = path;
				const [x0, y0] = transform([x, y, relative]);
				return [rx, ry, x_axis_rot, large_arc, sweep, x0, y0];
			default:
				console.assert(path.length === 2, "Point commands must only have 2 values");
				return transform([path[0], path[1], relative]);
		}
	}

	const op = d[0];
	let subPath = d.substr(1);
	const points = subPath.replaceAll(",", " ").replaceAll(/\s+/g, ' ').trim().split(" ").map(parseFloat);
	const transformed = getTransformed(op, points);
	const transformedString = transformed.map(p => p.toString()).join(",")
	return op + transformedString;
}).join(" ")

// const defaultPath = `M20,10L26,3L29,2L28,5L21,11C22,12,22,13,23,12C23,13,24,14,23,14A1.42,1.42,0,0,1,22,15A5,5,0,0,0,20,12Q19.5,11.9,19.5,12.5T18,13.8T17.2,13T18.5,11.5T19,11A5,5,90,0,0,16,9A1.42,1.42,0,0,1,17,8C17,7,18,8,19,8C18,9,19,9,20,10M26,3L26,5L28,5L26.2,4.8L26,3Z`

const Motif = ({pathD, fill="grey", stroke="grey", strokeWidth=.5, transforms=[], animate=false}) => {
	// Identity transformation
	transforms.push((pos) => pos)
	// P1 Group (only translations)
	const translations = [
		// Identity
		(pos) => translate(pos, 0, 0),
		// // Top Left
		// (pos) => translate(pos, -T1, -T2),
		// // Top
		// (pos) => translate(pos, 0, -T2),
		// // Top Right
		// (pos) => translate(pos, T1, -T2),
		// // Right
		// (pos) => translate(pos, T1, 0),
		// // Bottom Right
		// (pos) => translate(pos, T1, T2),
		// // Bottom
		// (pos) => translate(pos, 0, T2),
		// // Bottom Left
		// (pos) => translate(pos, -T1, T2),
		// // Left
		// (pos) => translate(pos, -T1, 0),
	]

	let tor = [pathD];
	translations.forEach((translation, translationInd) => {
		transforms.forEach((transform, transformInd) => {
			tor.push(applyTransform(pathD, pos => chain([transform, translation], pos)))
		})
	})
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

	const getLine = (a, b, c, xStart=SVG_DIM.minX, xFin=SVG_DIM.maxX) => `M ${xStart} ${-(a*xStart + c)/b} L ${xFin} ${-(a*xFin + c)/b}`;

	const groups = {
		p1: [],
		p2: [
			(pos) => rotate(pos, -T1/2, -T2/2, 180), // Top Left
			(pos) => rotate(pos, 0, -T2/2, 180), // Top
			(pos) => rotate(pos, T1/2, -T2/2, 180), // Top Right
			(pos) => rotate(pos, -T1/2, 0, 180), // Left
			(pos) => rotate(pos, 0, 0, 180), // Center
			(pos) => rotate(pos, T1/2, 0, 180), // Right
			(pos) => rotate(pos, -T1/2, T2/2, 180), // Bottom Left
			(pos) => rotate(pos, 0, T2/2, 180), // Bottom
			(pos) => rotate(pos, T1/2, T2/2, 180), // Bottom Right
		],
		pm_h: [
			(pos) => reflect(pos, 0, 1, -T2/2), // Top
			(pos) => reflect(pos, 0, 1, 0), // Center
			(pos) => reflect(pos, 0, 1, T2/2), // Bottom
		],
		pm_v: [
			(pos) => reflect(pos, 1, 0, -T1/2), // Left
			(pos) => reflect(pos, 1, 0, 0), // Center
			(pos) => reflect(pos, 1, 0, T1/2), // Right
		],
		// pm_horizontal: [reflectX],
		// pm_vertical: [reflectY],
		// pg_horizontal: [glideHorizontal],
		// pg_vertical: [glideVertical],
		pg: [
			(pos) => glide(pos, 
				(pos) => translate(pos, SVG_DIM.maxX - T1, 0), 
				(pos) => reflect(pos, 0, 1, -T2/2)), // Top
			(pos) => glide(pos, 
				(pos) => translate(pos, SVG_DIM.maxX - T1, 0), 
				(pos) => reflect(pos, 0, 1, 0)), // Center
			(pos) => glide(pos, 
				(pos) => translate(pos, SVG_DIM.maxX - T1, 0), 
				(pos) => reflect(pos, 0, 1, T2/2)) // Bottom
		],
		pmm: [
			(pos) => reflect(pos, 0, 1, 0), // x-axis
			(pos) => reflect(pos, 1, 0, 0), // y-axis
			(pos) => reflect(pos, 1, 0, T1/2), // left
			(pos) => reflect(pos, 1, 0, -T1/2), // right
			(pos) => reflect(pos, 0, 1, -T2/2), // bottom
			(pos) => reflect(pos, 0, 1, T2/2), // top

			(pos) => rotate(pos, 0, 0, 180), // halfturn about center
			(pos) => rotate(pos, -T1/2, 0, 180), // halfturn about left center
			(pos) => rotate(pos, T1/2, 0, 180), // halfturn about right center
			(pos) => rotate(pos, 0, -T2/2, 180), // halfturn about top center
			(pos) => rotate(pos, 0, T2/2, 180), // halfturn about bottom center
			(pos) => rotate(pos, -T1/2, -T2/2, 180), // halfturn about top left
			(pos) => rotate(pos, T1/2, -T2/2, 180), // halfturn about top right
			(pos) => rotate(pos, T1/2, T2/2, 180), // halfturn about bottom right
			(pos) => rotate(pos, -T1/2, T2/2, 180), // halfturn about bottom left
		],
		pmg_h: [
			(pos) => rotate(pos, 0, -T2/4, 180), // halfturn about top center
			(pos) => rotate(pos, 0, T2/4, 180), // halfturn about bottom center
			(pos) => rotate(pos, -T1/2, -T2/4, 180), // halfturn about left top center
			(pos) => rotate(pos, -T1/2, T2/4, 180), // halfturn about left bottom center
			(pos) => rotate(pos, T1/2, -T2/4, 180), // halfturn about right top center
			(pos) => rotate(pos, T1/2, T2/4, 180), // halfturn about right bottom center
			(pos) => glide(pos, (pos) => translate(pos, 0, SVG_DIM.maxY - T2), 
				(pos) => reflect(pos, 1, 0, 0)), // glide reflection about y-axis
			(pos) => glide(pos, (pos) => translate(pos, 0, SVG_DIM.maxY - T2), 
				(pos) => reflect(pos, 1, 0, T2/2)), // glide reflection about left lattice
			(pos) => glide(pos, (pos) => translate(pos, 0, SVG_DIM.maxY - T2), 
				(pos) => reflect(pos, 1, 0, -T2/2)), // glide reflection about right lattice
			(pos) => reflect(pos, 0, 1, 0), // reflection about x-axis
			(pos) => reflect(pos, 0, 1, T2/2), // reflection about top
			(pos) => reflect(pos, 0, 1, -T2/2), // reflection about bottom
		],
		pmg_v: [
			(pos) => rotate(pos, -T1/4, 0, 180), // halfturn about left center
			(pos) => rotate(pos, T1/4, 0, 180), // halfturn about right center
			(pos) => rotate(pos, -T1/4, -T2/2, 180), // halfturn about top left center
			(pos) => rotate(pos, -T1/4, T2/2, 180), // halfturn about bottom left center
			(pos) => rotate(pos, T1/4, -T2/2, 180), // halfturn about top right center
			(pos) => rotate(pos, T1/4, T2/2, 180), // halfturn about bottom right center
			(pos) => glide(pos, (pos) => translate(pos, SVG_DIM.maxX - T1, 0), 
				(pos) => reflect(pos, 0, 1, 0)), // glide reflection about x-axis
			(pos) => glide(pos, (pos) => translate(pos, SVG_DIM.maxX - T1, 0),
				(pos) => reflect(pos, 0, 1, T1/2)), // glide reflection about top lattice
			(pos) => glide(pos, (pos) => translate(pos, SVG_DIM.maxX - T1, 0), 
				(pos) => reflect(pos, 0, 1, -T1/2)), // glide reflection about bottom lattice
			(pos) => reflect(pos, 1, 0, 0), // reflection about y-axis
			(pos) => reflect(pos, 1, 0, T1/2), // reflection about left
			(pos) => reflect(pos, 1, 0, -T1/2), // reflection about right
		],
		pgg: [
			(pos) => rotate(pos, 0, 0, 180), // halfturn about origin
			(pos) => rotate(pos, -T1/2, 0, 180), // halfturn about left center
			(pos) => rotate(pos, T1/2, 0, 180), // halfturn about right center
			(pos) => rotate(pos, 0, -T2/2, 180), // halfturn about top center
			(pos) => rotate(pos, 0, T2/2, 180), // halfturn about bottom center
			(pos) => rotate(pos, -T1/2, -T2/2, 180), // halfturn about top left
			(pos) => rotate(pos, -T1/2, T2/2, 180), // halfturn about bottom left
			(pos) => rotate(pos, T1/2, T2/2, 180), // halfturn about bottom right
			(pos) => rotate(pos, T1/2, -T2/2, 180), // halfturn about top right
			(pos) => glide(pos, (pos) => translate(pos, 0, SVG_DIM.maxY - T2), 
				(pos) => reflect(pos, 1, 0, T2/4)), // glide reflection about middle left
			(pos) => glide(pos, (pos) => translate(pos, 0, SVG_DIM.maxY - T2), 
				(pos) => reflect(pos, 1, 0, -T2/4)), // glide reflection about middle right
			(pos) => glide(pos, (pos) => translate(pos, SVG_DIM.maxX - T1, 0), 
				(pos) => reflect(pos, 0, 1, -T1/4)), // glide reflection about middle top
			(pos) => glide(pos, (pos) => translate(pos, SVG_DIM.maxX - T1, 0), 
				(pos) => reflect(pos, 0, 1, T1/4)), // glide reflection about middle bottom
		],
		p4: [
			(pos) => rotate(pos, 0, 0, 90), // 90deg about origin
			(pos) => rotate(pos, 0, 0, 180), // 180deg about origin
			(pos) => rotate(pos, 0, 0, 270), // 270deg about origin
			(pos) => rotate(pos, -T1/2, 0, 180), // halfturn about left center
			(pos) => rotate(pos, T1/2, 0, 180), // halfturn about right center
			(pos) => rotate(pos, 0, -T2/2, 180), // halfturn about top center
			(pos) => rotate(pos, 0, T2/2, 180), // halfturn about bottom center
			(pos) => rotate(pos, -T1/2, -T2/2, 90), // 90deg about top left
			(pos) => rotate(pos, -T1/2, -T2/2, 180), // 180deg about top left
			(pos) => rotate(pos, -T1/2, -T2/2, 270), // 270deg about top left
			(pos) => rotate(pos, -T1/2, T2/2, 90), // 90deg about bottom left
			(pos) => rotate(pos, -T1/2, T2/2, 180), // 180deg about bottom left
			(pos) => rotate(pos, -T1/2, T2/2, 270), // 270deg about bottom left
			(pos) => rotate(pos, T1/2, T2/2, 90), // 90deg about bottom right
			(pos) => rotate(pos, T1/2, T2/2, 180), // 180deg about bottom right
			(pos) => rotate(pos, T1/2, T2/2, 270), // 270deg about bottom right
			(pos) => rotate(pos, T1/2, -T2/2, 90), // 90deg about top right
			(pos) => rotate(pos, T1/2, -T2/2, 180), // 180deg about top right
			(pos) => rotate(pos, T1/2, -T2/2, 270), // 270deg about top right
		],
		p4m: [
			(pos) => rotate(pos, 0, 0, 90), // 90deg about origin
			(pos) => rotate(pos, 0, 0, 180), // 180deg about origin
			(pos) => rotate(pos, 0, 0, 270), // 270deg about origin
			(pos) => rotate(pos, -T1/2, 0, 180), // halfturn about left center
			(pos) => rotate(pos, T1/2, 0, 180), // halfturn about right center
			(pos) => rotate(pos, 0, -T2/2, 180), // halfturn about top center
			(pos) => rotate(pos, 0, T2/2, 180), // halfturn about bottom center
			(pos) => rotate(pos, -T1/2, -T2/2, 90), // 90deg about top left
			(pos) => rotate(pos, -T1/2, -T2/2, 180), // 180deg about top left
			(pos) => rotate(pos, -T1/2, -T2/2, 270), // 270deg about top left
			(pos) => rotate(pos, -T1/2, T2/2, 90), // 90deg about bottom left
			(pos) => rotate(pos, -T1/2, T2/2, 180), // 180deg about bottom left
			(pos) => rotate(pos, -T1/2, T2/2, 270), // 270deg about bottom left
			(pos) => rotate(pos, T1/2, T2/2, 90), // 90deg about bottom right
			(pos) => rotate(pos, T1/2, T2/2, 180), // 180deg about bottom right
			(pos) => rotate(pos, T1/2, T2/2, 270), // 270deg about bottom right
			(pos) => rotate(pos, T1/2, -T2/2, 90), // 90deg about top right
			(pos) => rotate(pos, T1/2, -T2/2, 180), // 180deg about top right
			(pos) => rotate(pos, T1/2, -T2/2, 270), // 270deg about top right
			(pos) => reflect(pos, 1, -1, 0), // reflection in the line y = x
			(pos) => reflect(pos, 1, 1, 0), // reflection in the line y = -x
			(pos) => reflect(pos, 1, 0, 0), // reflection about y-axis
			(pos) => reflect(pos, 0, 1, 0), // reflection about x-axis
			(pos) => glide(pos, pos => translate(pos, SVG_DIM.maxX - T1, SVG_DIM.maxY - T2), pos => reflect(pos, 1, -1, T2/2)),
			(pos) => glide(pos, pos => translate(pos, SVG_DIM.maxX - T1, SVG_DIM.maxY - T2), pos => reflect(pos, 1, -1, -T2/2)),
			(pos) => glide(pos, pos => translate(pos, SVG_DIM.maxX - T1, SVG_DIM.maxY - T2), pos => reflect(pos, 1, 1, T2/2)),
			(pos) => glide(pos, pos => translate(pos, SVG_DIM.maxX - T1, SVG_DIM.maxY - T2), pos => reflect(pos, 1, 1, -T2/2)),
		],
		p4g: [
			(pos) => rotate(pos, 0, 0, 90), // 90deg about origin
			(pos) => rotate(pos, 0, 0, 180), // 180deg about origin
			(pos) => rotate(pos, 0, 0, 270), // 270deg about origin
			(pos) => rotate(pos, -T1/2, 0, 180), // halfturn about left center
			(pos) => rotate(pos, T1/2, 0, 180), // halfturn about right center
			(pos) => rotate(pos, 0, -T2/2, 180), // halfturn about top center
			(pos) => rotate(pos, 0, T2/2, 180), // halfturn about bottom center
			(pos) => rotate(pos, -T1/2, -T2/2, 90), // 90deg about top left
			(pos) => rotate(pos, -T1/2, -T2/2, 180), // 180deg about top left
			(pos) => rotate(pos, -T1/2, -T2/2, 270), // 270deg about top left
			(pos) => rotate(pos, -T1/2, T2/2, 90), // 90deg about bottom left
			(pos) => rotate(pos, -T1/2, T2/2, 180), // 180deg about bottom left
			(pos) => rotate(pos, -T1/2, T2/2, 270), // 270deg about bottom left
			(pos) => rotate(pos, T1/2, T2/2, 90), // 90deg about bottom right
			(pos) => rotate(pos, T1/2, T2/2, 180), // 180deg about bottom right
			(pos) => rotate(pos, T1/2, T2/2, 270), // 270deg about bottom right
			(pos) => rotate(pos, T1/2, -T2/2, 90), // 90deg about top right
			(pos) => rotate(pos, T1/2, -T2/2, 180), // 180deg about top right
			(pos) => rotate(pos, T1/2, -T2/2, 270), // 270deg about top right
			(pos) => reflect(pos, 1, -1, T2/2), // Reflection in line y=x-b
			(pos) => reflect(pos, 1, -1, -T2/2), // Reflection in line y=x+b
			(pos) => reflect(pos, 1, 1, T2/2), // Reflection in line y=-x-b
			(pos) => reflect(pos, 1, 1, -T2/2), // Reflection in line y=-x+b
			(pos) => glide(pos, pos => translate(pos, 0, SVG_DIM.maxY - T2), pos => reflect(pos, 1, 0, -T1/4)), // Glide reflection about middle left
			(pos) => glide(pos, pos => translate(pos, 0, SVG_DIM.maxY - T2), pos => reflect(pos, 1, 0, T1/4)), // Glide reflection about middle right
			(pos) => glide(pos, pos => translate(pos, SVG_DIM.maxX - T1, 0), pos => reflect(pos, 0, 1, -T2/4)), // Glide reflection about middle top
			(pos) => glide(pos, pos => translate(pos, SVG_DIM.maxX - T1, 0), pos => reflect(pos, 0, 1, T2/4)), // Glide reflection about middle bottom
			(pos) => glide(pos, pos => translate(pos, SVG_DIM.maxX - T1, SVG_DIM.maxY - T2), pos => reflect(pos, 1, -1, 0)),
			(pos) => glide(pos, pos => translate(pos, SVG_DIM.maxX - T1, SVG_DIM.maxY - T2), pos => reflect(pos, 1, 1, 0)),
		]
	}

	const [group, setGroup] = useState("p1");
	const [swordCoords, setSwordCoords] = useState([10, 25]);

	const defaultPath = (x, y) => `M${x},${y}l6,-7l3,-1l-1,3l-7,6c1,1,1,2,2,1c0,1,1,2,0,2a1.42,1.42,0,0,1,-1,1a5,5,0,0,0,-2,-3q-0.5,-0.1,-0.5,0.5t-1.5,1.3t-0.8,-0.8t1.3,-1.5t0.5,-0.5a5,5,90,0,0,-3,-2a1.42,1.42,0,0,1,1,-1c0,-1,1,0,2,0c-1,1,0,1,1,2m6,-7l0,2l2,0l-1.8,-0.2l-0.2,-1.8z`

	return <Layout>
		<Seo title="Home" />
		<h1>Hi people</h1>
		<p>Welcome to your new Gatsby site.</p>
		<p>Now go build something great.</p>

		<svg viewBox={`${SVG_DIM.minX * scale} ${SVG_DIM.minY * scale} ${T1 * scale} ${T2 * scale}`} width="50%">
			
			{/* <rect height="100" width="100" stroke="grey" strokeWidth=".5" fill="white" x={SVG_DIM.minX} y={SVG_DIM.minY * 3}></rect> */}
			<rect x={SVG_DIM.minX * scale} y={SVG_DIM.minY * scale} width={T1 * scale} height={T2 * scale} fill="none" stroke="grey" strokeWidth="3" />
			<rect height={T2} width={T1} stroke="grey" strokeWidth=".5" fill="white" x={SVG_DIM.minX} y={SVG_DIM.minY}></rect>
			<g id="Sword">
				<Motif pathD={defaultPath(swordCoords[0], swordCoords[1])} transforms={groups[group]} strokeWidth={0} animate={true}/>
			</g>
			{/* <g id="y=x">
				<Motif pathD={getLine(-1, 1, 0)} transforms={[]} />
			</g>
			<g id="y=-x">
				<Motif pathD={getLine(1, 1, 0)} transforms={[]} />
			</g>
			<g id="y=x+b">
				<Motif pathD={getLine(-1, 1, -T2/2)} transforms={[]} />
			</g>
			<g id="y=-x+b">
				<Motif pathD={getLine(1, 1, -T2/2)} transforms={[]} />
			</g>
			<g id="y=x-b">
				<Motif pathD={getLine(-1, 1, T2/2)} transforms={[]} />
			</g>
			<g id="y=-x-b">
				<Motif pathD={getLine(1, 1, T2/2)} transforms={[]} />
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
			</g> */}
		</svg>
		<br />
		<Select defaultValue="p1" style={{ width: 120 }} onChange={(value) => setGroup(value)}>
			{Object.keys(groups).map((g, i) => <Option value={g} key={i}>{g}</Option>)}
    	</Select>
		<InputNumber min={SVG_DIM.minX} max={SVG_DIM.maxX} defaultValue={swordCoords[0]} onChange={value => setSwordCoords([value, swordCoords[1]])} />
		<InputNumber min={SVG_DIM.minY} max={SVG_DIM.maxY} defaultValue={swordCoords[1]} onChange={value => setSwordCoords([swordCoords[0], value])} />

		<p>
			<Link to="/page-2/">Go to page 2</Link> <br />
			<Link to="/using-typescript/">Go to "Using TypeScript"</Link>
		</p>
	</Layout>
}

export default IndexPage
