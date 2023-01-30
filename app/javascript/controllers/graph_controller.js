import { Controller } from "@hotwired/stimulus"
import * as d3 from "d3"

export default class extends Controller {
  static targets = ["draw", "labels"]

  connect() {
    console.log("Graph controller")
    this.hiddenCompleted = false;
    this.render()
  }

  toggleHidden() {
    this.hiddenCompleted = !this.hiddenCompleted
    this.render()
  }

  fluxo() {
    const nodes = JSON.parse(document.querySelector("meta[name=nodes]").content)
    const links = JSON.parse(document.querySelector("meta[name=links]").content)
    
    if (this.hiddenCompleted) {
      const filter = ['ISC', 'OAC', 'APC', 'TP1', 'PE', 'ED', 'C1', 'C2', 'CL', 'LCL', 'IAL']
      return {
        nodes: nodes.filter(({id}) => !filter.includes(id)),
        links: links.filter(({source, target}) => !filter.includes(source) && !filter.includes(target))
      }
    }
    
    return { nodes, links }
  }

  render() {
    const fluxo = this.fluxo()
    console.log(fluxo)
    const preRequirements = (id) => fluxo.links
      .filter(({target}) => target === id)
    
    const preRequirementsText = (id) => {
      const pr = preRequirements(id)
      const content = pr.map(({source}) => `<span class="fw-bold">${fluxo.nodes.find(({id}) => id === source).name}</span>`).join(" e ")
      return pr.length ? `<p>Pré-requisitos: ${content}</p>` : ""
    }

    const chart = ForceGraph(fluxo, {
      nodeId: d => d.id,
      nodeGroup: d => d.group,
      nodeTitle: d => d.name,
      nodeDescription: d => `<p>${d.group}º semestre</p>${preRequirementsText(d.id)}<p><a type="button" class="btn btn-success disabled">Consultar oferta</a></p>`,
      nodeRadius: 24,
      nodeStrength: -100,
      linkStrength: 0.005,
      linkStrokeWidth: 3,
      linkStrokeOpacity: 1,
      linkStroke: "#ccc",
      width: 1200,
      height: 800
    })

    this.drawTarget.replaceChildren(chart)

    const semesters = [...new Set(fluxo.nodes.map(({group}) => group))].sort()
    const labelColor = chart.scales.color

    d3.select(this.labelsTarget).selectAll("p").data(semesters).join("p")
    .text(d => `${d}º semestre`)
    .append("svg")
      .attr("class", "bi mx-1")
      .attr("width", "16")
      .attr("height", "16")
      .attr("viewBox", "0 0 16 16")
      .attr("aria-hidden", "true")
      .attr("fill", d => labelColor(d))
      .lower()
      .append("circle")
        .attr("cx", 8)
        .attr("cy", 8)
        .attr("r", 8)
  }
}

// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/force-directed-graph
function ForceGraph({
    nodes, // an iterable of node objects (typically [{id}, …])
    links // an iterable of link objects (typically [{source, target}, …])
  }, {
    nodeId = d => d.id, // given d in nodes, returns a unique identifier (string)
    nodeGroup, // given d in nodes, returns an (ordinal) value for color
    nodeGroups, // an array of ordinal values representing the node groups
    nodeTitle, // given d in nodes, a title string
    nodeDescription, // a description string
    nodeFill = "currentColor", // node stroke fill (if not using a group color encoding)
    nodeStroke = "#fff", // node stroke color
    nodeStrokeWidth = 1.5, // node stroke width, in pixels
    nodeStrokeOpacity = 1, // node stroke opacity
    nodeRadius = 5, // node radius, in pixels
    nodeStrength,
    linkSource = ({source}) => source, // given d in links, returns a node identifier string
    linkTarget = ({target}) => target, // given d in links, returns a node identifier string
    linkStroke = "#999", // link stroke color
    linkStrokeOpacity = 0.6, // link stroke opacity
    linkStrokeWidth = 1.5, // given d in links, returns a stroke width in pixels
    linkStrokeLinecap = "round", // link stroke linecap
    linkStrength,
    colors = d3.schemeTableau10, // an array of color strings, for the node groups
    width = 640, // outer width, in pixels
    height = 400, // outer height, in pixels
    invalidation // when this promise resolves, stop the simulation
  } = {}) {
    // Compute values.
    const N = d3.map(nodes, nodeId).map(intern);
    const LS = d3.map(links, linkSource).map(intern);
    const LT = d3.map(links, linkTarget).map(intern);
    if (nodeTitle === undefined) nodeTitle = (_, i) => N[i];
    const T = nodeTitle == null ? null : d3.map(nodes, nodeTitle);
    const C = nodeDescription == null ? null : d3.map(nodes, nodeDescription);
    const G = nodeGroup == null ? null : d3.map(nodes, nodeGroup).map(intern);
    const W = typeof linkStrokeWidth !== "function" ? null : d3.map(links, linkStrokeWidth);
    const L = typeof linkStroke !== "function" ? null : d3.map(links, linkStroke);
  
    // Replace the input nodes and links with mutable objects for the simulation.
    nodes = d3.map(nodes, (_, i) => ({id: N[i]}));
    links = d3.map(links, (_, i) => ({source: LS[i], target: LT[i]}));
  
    // Compute default domains.
    if (G && nodeGroups === undefined) nodeGroups = d3.sort(G);
  
    // Construct the scales.
    const color = nodeGroup == null ? null : d3.scaleOrdinal(nodeGroups, colors);
  
    // Construct the forces.
    const forceNode = d3.forceManyBody();
    const forceLink = d3.forceLink(links).id(({index: i}) => N[i]);
    if (nodeStrength !== undefined) forceNode.strength(nodeStrength);
    if (linkStrength !== undefined) forceLink.strength(linkStrength);
  
    const simulation = d3.forceSimulation(nodes)
        .force("link", forceLink)
        .force("charge", forceNode)
        .force("center",  d3.forceCenter())
        .on("tick", ticked);
    
    function handleZoom(e) {
      d3.selectAll('svg>g')
        .attr('transform', e.transform);
    }
    
    const zoom = d3.zoom().on('zoom', handleZoom);
  
    const svg = d3.create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [-width / 2, -height / 2, width, height])
        .attr("style", "max-width: 100%; height: auto; height: intrinsic; background-color: #0009;")
        .call(zoom);

    // Per-type markers, as they don't inherit styles.
    svg.append("defs")
      .append("marker")
        .attr("id", "arrow")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", nodeRadius - 0.5)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
      .append("path")
        .attr("fill", typeof linkStroke !== "function" ? linkStroke : null)
        .attr("stroke", typeof linkStroke !== "function" ? linkStroke : null)
        .attr("stroke-opacity", linkStrokeOpacity)
        .attr("stroke-linecap", linkStrokeLinecap)
        .attr("d", "M0,-5L10,0L0,5");
  
    const link = svg.append("g")
        .attr("stroke", typeof linkStroke !== "function" ? linkStroke : null)
        .attr("stroke-opacity", linkStrokeOpacity)
        .attr("stroke-width", typeof linkStrokeWidth !== "function" ? linkStrokeWidth : null)
        .attr("stroke-linecap", linkStrokeLinecap)
      .selectAll("path")
      .data(links)
      .join("path")
        .attr("stroke", typeof linkStroke !== "function" ? linkStroke : null)
        .attr("marker-end", `url(${new URL("#arrow", location)})`);
  
    const node = svg.append("g")
        .attr("fill", nodeFill)
        .attr("stroke", nodeStroke)
        .attr("stroke-opacity", nodeStrokeOpacity)
        .attr("stroke-width", nodeStrokeWidth)
      .selectAll("g")
      .data(nodes)
      .join("g")
        .attr("class", "node")
        .attr("data-controller", "popover")
        .attr("data-bs-title", ({index: i}) => T[i])
        .attr("data-bs-content", ({index: i}) => C[i])
        .call(drag(simulation));

    const circle = node.append("circle")
      .attr("r", nodeRadius)
  
    if (W) link.attr("stroke-width", ({index: i}) => W[i]);
    if (L) link.attr("stroke", ({index: i}) => L[i]);
    if (G) circle.attr("fill", ({index: i}) => color(G[i]));
    if (T) node.append("title").text(({index: i}) => T[i]);

    node.append("text")
      .text(d => d.id)
      .attr("text-anchor", "middle")
      .attr("stroke-width", 0);

    if (invalidation != null) invalidation.then(() => simulation.stop());
  
    function intern(value) {
      return value !== null && typeof value === "object" ? value.valueOf() : value;
    }

    function linkLine(d) {
      return `
        M${d.source.x},${d.source.y}
        L${d.target.x},${d.target.y}
      `
    }
  
    function ticked() {
      /*link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);*/
      link.attr("d", linkLine);
      
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    }
  
    function drag(simulation) {    
      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.1).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      
      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      
      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
      
      return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }
  
    return Object.assign(svg.node(), {scales: {color}});
  }

