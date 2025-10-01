import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

/**
 * Interactive Line Chart for showing performance trends over time
 * Features: Animated lines, hover tooltips, responsive design
 */
export default function TrendLineChart({ data, height = 300, title = "Performance Trend" }) {
  const svgRef = useRef();
  const tooltipRef = useRef();
  const containerRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove();
    
    const container = containerRef.current;
    const margin = { top: 20, right: 80, bottom: 40, left: 60 };
    const width = container.offsetWidth - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales
    const xScale = d3.scalePoint()
      .domain(data.map(d => d.label))
      .range([0, width])
      .padding(0.5);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => Math.max(d.aek || 0, d.real || 0)) * 1.1])
      .range([chartHeight, 0])
      .nice();

    // Create line generators
    const lineAek = d3.line()
      .x(d => xScale(d.label))
      .y(d => yScale(d.aek || 0))
      .curve(d3.curveMonotoneX);

    const lineReal = d3.line()
      .x(d => xScale(d.label))
      .y(d => yScale(d.real || 0))
      .curve(d3.curveMonotoneX);

    // Add grid lines
    svg.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.1)
      .call(d3.axisLeft(yScale)
        .tickSize(-width)
        .tickFormat(''))
      .select('.domain').remove();

    // Add X axis
    svg.append('g')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)')
      .style('font-size', '11px')
      .style('fill', '#9ca3af');

    // Add Y axis
    svg.append('g')
      .call(d3.axisLeft(yScale).ticks(5))
      .selectAll('text')
      .style('font-size', '11px')
      .style('fill', '#9ca3af');

    // Create tooltip
    const tooltip = d3.select(tooltipRef.current)
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background-color', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('padding', '8px 12px')
      .style('border-radius', '6px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '1000');

    // Add AEK line with animation
    const pathAek = svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 3)
      .attr('d', lineAek);

    // Animate AEK line
    const lengthAek = pathAek.node().getTotalLength();
    pathAek
      .attr('stroke-dasharray', lengthAek)
      .attr('stroke-dashoffset', lengthAek)
      .transition()
      .duration(1500)
      .ease(d3.easeLinear)
      .attr('stroke-dashoffset', 0);

    // Add Real line with animation
    const pathReal = svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#ef4444')
      .attr('stroke-width', 3)
      .attr('d', lineReal);

    // Animate Real line
    const lengthReal = pathReal.node().getTotalLength();
    pathReal
      .attr('stroke-dasharray', lengthReal)
      .attr('stroke-dashoffset', lengthReal)
      .transition()
      .duration(1500)
      .ease(d3.easeLinear)
      .attr('stroke-dashoffset', 0);

    // Add data points with hover effect
    const addDataPoints = (dataset, color, team) => {
      svg.selectAll(`.dot-${team}`)
        .data(data)
        .enter()
        .append('circle')
        .attr('class', `dot-${team}`)
        .attr('cx', d => xScale(d.label))
        .attr('cy', d => yScale(d[team] || 0))
        .attr('r', 0)
        .attr('fill', color)
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr('r', 8);
          
          tooltip
            .style('visibility', 'visible')
            .html(`
              <div style="font-weight: bold; margin-bottom: 4px;">${d.label}</div>
              <div>AEK: ${d.aek || 0}</div>
              <div>Real: ${d.real || 0}</div>
            `);
        })
        .on('mousemove', function(event) {
          tooltip
            .style('top', (event.pageY - 60) + 'px')
            .style('left', (event.pageX + 10) + 'px');
        })
        .on('mouseout', function() {
          d3.select(this)
            .transition()
            .duration(200)
            .attr('r', 5);
          
          tooltip.style('visibility', 'hidden');
        })
        .transition()
        .delay((d, i) => i * 100 + 1500)
        .duration(300)
        .attr('r', 5);
    };

    addDataPoints(data, '#3b82f6', 'aek');
    addDataPoints(data, '#ef4444', 'real');

    // Add legend
    const legend = svg.append('g')
      .attr('transform', `translate(${width - 100}, 0)`);

    legend.append('line')
      .attr('x1', 0)
      .attr('x2', 20)
      .attr('y1', 0)
      .attr('y2', 0)
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 3);

    legend.append('text')
      .attr('x', 25)
      .attr('y', 4)
      .text('AEK')
      .style('font-size', '12px')
      .style('fill', '#9ca3af');

    legend.append('line')
      .attr('x1', 0)
      .attr('x2', 20)
      .attr('y1', 20)
      .attr('y2', 20)
      .attr('stroke', '#ef4444')
      .attr('stroke-width', 3);

    legend.append('text')
      .attr('x', 25)
      .attr('y', 24)
      .text('Real')
      .style('font-size', '12px')
      .style('fill', '#9ca3af');

  }, [data, height]);

  return (
    <div ref={containerRef} className="w-full">
      <h3 className="text-lg font-semibold mb-4 text-text-primary">{title}</h3>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
        <svg ref={svgRef}></svg>
        <div ref={tooltipRef}></div>
      </div>
    </div>
  );
}
