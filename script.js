/* =========================
   LOAD DATA
========================= */
let data;

// Fetch data from data.json
fetch("data.json")
  .then((response) => response.json())
  .then((jsonData) => {
    data = jsonData;
    initializeMindMap();
  })
  .catch((error) => {
    console.error("Error loading data:", error);
  });

/* =========================
   INITIALIZE MIND MAP
========================= */
function initializeMindMap() {
  /* =========================
       SETUP
    ========================= */
  const width = window.innerWidth;
  const height = window.innerHeight;

  const svg = d3.select("#chart").attr("viewBox", [0, 0, width, height]);

  const g = svg.append("g");

  /* ===== ZOOM + PAN ===== */
  let currentTransform = d3.zoomIdentity;

  const zoom = d3
    .zoom()
    .scaleExtent([0.3, 3])
    .on("zoom", (event) => {
      currentTransform = event.transform;
      g.attr("transform", currentTransform);
    });

  svg.call(zoom);

  /* =========================
       TREE
    ========================= */
  const tree = d3.tree().nodeSize([90, 280]);

  let i = 0;
  const root = d3.hierarchy(data);
  root.x0 = height / 2;
  root.y0 = 0;

  root.children.forEach(collapse);

  /* ===== CENTER LẦN ĐẦU ===== */
  const startTransform = d3.zoomIdentity.translate(120, height / 2).scale(0.9);
  svg.call(zoom.transform, startTransform);

  update(root);

  /* =========================
       UPDATE
    ========================= */
  function update(source) {
    tree(root);

    const nodes = root.descendants();
    const links = root.links();

    const node = g.selectAll(".node").data(nodes, (d) => d.id || (d.id = ++i));

    const nodeEnter = node
      .enter()
      .append("g")
      .attr(
        "class",
        (d) =>
          "node " +
          (d.depth === 0
            ? "root"
            : d.depth === 1
            ? "level1"
            : d.depth === 2
            ? "level2"
            : "level3")
      )
      .attr("transform", `translate(${source.y0},${source.x0})`)
      .on("click", (e, d) => toggle(d));

    const text = nodeEnter
      .append("text")
      .text((d) => d.data.name)
      .call(wrapText, 220);

    nodeEnter
      .insert("rect", "text")
      .attr("x", function () {
        return -this.nextSibling.getBBox().width / 2 - 16;
      })
      .attr("y", function () {
        return -this.nextSibling.getBBox().height / 2 - 12;
      })
      .attr("width", function () {
        return this.nextSibling.getBBox().width + 32;
      })
      .attr("height", function () {
        return this.nextSibling.getBBox().height + 24;
      });

    nodeEnter
      .merge(node)
      .transition()
      .duration(400)
      .ease(d3.easeCubicInOut)
      .attr("transform", (d) => `translate(${d.y},${d.x})`);

    node.exit().remove();

    const link = g.selectAll(".link").data(links, (d) => d.target.id);

    link
      .enter()
      .append("path")
      .attr("class", "link")
      .merge(link)
      .transition()
      .duration(400)
      .ease(d3.easeCubicInOut)
      .attr("d", (d) => diagonal(d.source, d.target));

    link.exit().remove();
  }

  /* =========================
       HELPERS
    ========================= */
  function toggle(d) {
    if (d.children) {
      d._children = d.children;
      d.children = null;
    } else {
      d.children = d._children;
      d._children = null;
    }
    update(d);
  }

  function diagonal(s, d) {
    const sy = s.y + 120;
    const dy = d.y - 120;
    return `
      M ${sy} ${s.x}
      C ${(sy + dy) / 2} ${s.x},
        ${(sy + dy) / 2} ${d.x},
        ${dy} ${d.x}
    `;
  }

  function collapse(d) {
    if (d.children) {
      d._children = d.children;
      d._children.forEach(collapse);
      d.children = null;
    }
  }

  function wrapText(text, width) {
    text.each(function () {
      const t = d3.select(this);
      const words = t.text().split(/\s+/).reverse();
      let word,
        line = [],
        lineNumber = 0;
      const lineHeight = 1.2;
      const y = t.attr("y") || 0;
      let tspan = t.text(null).append("tspan").attr("x", 0).attr("y", y);

      while ((word = words.pop())) {
        line.push(word);
        tspan.text(line.join(" "));
        if (tspan.node().getComputedTextLength() > width) {
          line.pop();
          tspan.text(line.join(" "));
          line = [word];
          tspan = t
            .append("tspan")
            .attr("x", 0)
            .attr("y", y)
            .attr("dy", ++lineNumber * lineHeight + "em")
            .text(word);
        }
      }
    });
  }
}
