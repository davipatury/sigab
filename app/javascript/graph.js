import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm"

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
        .attr("style", "max-width: 100%; height: auto; height: intrinsic;")
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

const miserables = JSON.parse(`{
  "nodes": [
    {"id":"C1","name":"Cálculo 1","group":1},
    {"id":"APC","name":"Algoritmo e Programação de Computadores","group":1},
    {"id":"ISC","name":"Introdução a Sistemas de Computação","group":1},
    {"id":"C2","name":"Cálculo 2","group":2},
    {"id":"CL","name":"Circuitos Lógicos","group":2},
    {"id":"LCL","name":"Laboratório de Circuitos Lógicos","group":2},
    {"id":"ED","name":"Estrutura de Dados","group":2},
    {"id":"FTC","name":"Fundamentos Teóricos da Computação","group":2},
    {"id":"IAL","name":"Introdução a Álgebra Linear","group":2},
    {"id":"PE","name":"Probabilidade e Estatística","group":3},
    {"id":"CN","name":"Cálculo Numérico","group":3},
    {"id":"A1","name":"Álgebra 1","group":3},
    {"id":"TP1","name":"Técnicas de Programação 1","group":3},
    {"id":"OAC","name":"Organização e Arquitetura de Computadores","group":3},
    {"id":"TP2","name":"Técnicas de Programação 2","group":4},
    {"id":"LC1","name":"Lógica Computacional 1","group":4},
    {"id":"RC","name":"Redes de Computadores","group":4},
    {"id":"TAG","name":"Teoria e Aplicação de Grafos","group":4},
    {"id":"BD","name":"Bancos de Dados","group":5},
    {"id":"IIA","name":"Introdução a Inteligência Artificial","group":5},
    {"id":"LP","name":"Linguagens de Programação","group":5},
    {"id":"ES","name":"Engenharia de Software","group":5},
    {"id":"PC","name":"Programação Concorrente","group":5},
    {"id":"CE","name":"Computação Experimental","group":6},
    {"id":"SI","name":"Sistemas de Informação","group":6},
    {"id":"SB","name":"Software Básico","group":6},
    {"id":"AC","name":"Autômatos e Computabilidade","group":6},
    {"id":"FSO","name":"Fundamentos de Sistemas Operacionais","group":6},
    {"id":"IS","name":"Informática e Sociedade","group":7},
    {"id":"PAA","name":"Projeto e Análise de Algoritmos","group":7},
    {"id":"SC","name":"Segurança Computacional","group":7},
    {"id":"C","name":"Compiladores","group":7}
  ],
  "links": [
    {"source":"C1","target":"PE"},
    {"source":"C1","target":"C2"},
    {"source":"C1","target":"PAA"},
    {"source":"APC","target":"ED"},
    {"source":"APC","target":"CL"},
    {"source":"APC","target":"LCL"},
    {"source":"FTC","target":"LC1"},
    {"source":"C2","target":"CN"},
    {"source":"CL","target":"OAC"},
    {"source":"LCL","target":"OAC"},
    {"source":"ED","target":"PAA"},
    {"source":"ED","target":"BD"},
    {"source":"ED","target":"SB"},
    {"source":"ED","target":"IIA"},
    {"source":"ED","target":"LP"},
    {"source":"ED","target":"TP1"},
    {"source":"ED","target":"TAG"},
    {"source":"ED","target":"RC"},
    {"source":"ED","target":"LC1"},
    {"source":"ED","target":"SI"},
    {"source":"ED","target":"CE"},
    {"source":"OAC","target":"SB"},
    {"source":"OAC","target":"PC"},
    {"source":"RC","target":"SC"},
    {"source":"TP1","target":"TP2"},
    {"source":"TP1","target":"ES"},
    {"source":"LP","target":"ES"},
    {"source":"LP","target":"C"},
    {"source":"SB","target":"C"},
    {"source":"TP2","target":"PC"},
    {"source":"PC","target":"FSO"},
    {"source":"A1","target":"AC"},
    {"source":"AC","target":"C"}
  ]
}`)


const chart = ForceGraph(miserables, {
  nodeId: d => d.id,
  nodeGroup: d => d.group,
  nodeTitle: d => `${d.id} - ${d.name}\n${d.group}º semestre`,
  nodeRadius: 24,
  nodeStrength: -100,
  linkStrength: 0.005,
  linkStrokeWidth: 3,
  linkStrokeOpacity: 1,
  linkStroke: "#ccc",
  width: 1200,
  height: 800
})

document.querySelector('.main-top.fluxo > div > div.col.align-self-end').appendChild(chart)
