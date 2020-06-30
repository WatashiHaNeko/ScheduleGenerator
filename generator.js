const d3 = require("d3");
const jsdom = require("jsdom");

const dom = new jsdom.JSDOM();

const body = dom.window.document.querySelector("body");

const svg = d3.select(body)
    .append("svg")
    .attr("xmlns", "http://www.w3.org/2000/svg")
    .attr("viewBox", ([0, 0, 100, 100]).join(" "))
    .attr("width", 1024)
    .attr("height", 1024)

svg.append("rect")
    .attr("x", 10)
    .attr("y", 10)
    .attr("width", 80)
    .attr("height", 80)
    .style("fill", "orange");

process.stdout.write(`<?xml version="1.0"?>${body.innerHTML}`);

