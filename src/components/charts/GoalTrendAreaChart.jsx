import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

/**
 * Interactive Area Chart for goal trends over time
 * Features: Animated area fill, gradient colors, tooltips
 */
export default function GoalTrendAreaChart({ data, height = 300, title = "Tor-Trends" }) {
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

    // Define gradients
    const defs = svg.append('defs');

    const gradientAek = defs.append('linearGradient')
      .attr('id', 'gradient-aek')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    gradientAek.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#3b82f6')
      .attr('stop-opacity', 0.6);

    gradientAek.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#3b82f6')
      .attr('stop-opacity', 0.1);

    const gradientReal = defs.append('linearGradient')
      .attr('id', 'gradient-real')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    gradientReal.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#ef4444')
      .attr('stop-opacity', 0.6);

    gradientReal.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#ef4444')
      .attr('stop-opacity', 0.1);

    // Create scales
    const xScale = d3.scalePoint()
      .domain(data.map(d => d.label))
      .range([0, width])
      .padding(0.5);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => Math.max(d.aek || 0, d.real || 0)) * 1.1])
      .range([chartHeight, 0])
      .nice();

    // Create area generators
    const areaAek = d3.area()
      .x(d => xScale(d.label))
      .y0(chartHeight)
      .y1(d => yScale(d.aek || 0))
      .curve(d3.curveMonotoneX);

    const areaReal = d3.area()
      .x(d => xScale(d.label))
      .y0(chartHeight)
      .y1(d => yScale(d.real || 0))
      .curve(d3.curveMonotoneX);

    // Create line generators for borders
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

    // Add AEK area with animation
    svg.append('path')
      .datum(data)
      .attr('fill', 'url(#gradient-aek)')
      .attr('d', areaAek)
      .style('opacity', 0)
      .transition()
      .duration(1000)
      .style('opacity', 1);

    // Add AEK line border
    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 2)
      .attr('d', lineAek)
      .style('opacity', 0)
      .transition()
      .duration(1000)
      .style('opacity', 1);

    // Add Real area with animation
    svg.append('path')
      .datum(data)
      .attr('fill', 'url(#gradient-real)')
      .attr('d', areaReal)
      .style('opacity', 0)
      .transition()
      .duration(1000)
      .delay(300)
      .style('opacity', 0.7);

    // Add Real line border
    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#ef4444')
      .attr('stroke-width', 2)
      .attr('d', lineReal)
      .style('opacity', 0)
      .transition()
      .duration(1000)
      .delay(300)
      .style('opacity', 1);

    // Add interactive overlay for tooltips
    svg.selectAll('.overlay-point')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'overlay-point')
      .attr('cx', d => xScale(d.label))
      .attr('cy', d => yScale(Math.max(d.aek || 0, d.real || 0)))
      .attr('r', 20)
      .attr('fill', 'transparent')
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        // Highlight point
        svg.append('circle')
          .attr('class', 'highlight-point')
          .attr('cx', xScale(d.label))
          .attr('cy', yScale(d.aek || 0))
          .attr('r', 5)
          .attr('fill', '#3b82f6')
          .attr('stroke', 'white')
          .attr('stroke-width', 2);

        svg.append('circle')
          .attr('class', 'highlight-point')
          .attr('cx', xScale(d.label))
          .attr('cy', yScale(d.real || 0))
          .attr('r', 5)
          .attr('fill', '#ef4444')
          .attr('stroke', 'white')
          .attr('stroke-width', 2);
        
        tooltip
          .style('visibility', 'visible')
          .html(`
            <div style="font-weight: bold; margin-bottom: 4px;">${d.label}</div>
            <div style="color: #60a5fa;">AEK Tore: ${d.aek || 0}</div>
            <div style="color: #f87171;">Real Tore: ${d.real || 0}</div>
            <div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid #444;">
              Gesamt: ${(d.aek || 0) + (d.real || 0)}
            </div>
          `);
      })
      .on('mousemove', function(event) {
        tooltip
          .style('top', (event.pageY - 80) + 'px')
          .style('left', (event.pageX + 10) + 'px');
      })
      .on('mouseout', function() {
        svg.selectAll('.highlight-point').remove();
        tooltip.style('visibility', 'hidden');
      });

    // Add legend
    const legend = svg.append('g')
      .attr('transform', `translate(${width - 100}, 0)`);

    legend.append('rect')
      .attr('width', 20)
      .attr('height', 12)
      .attr('fill', 'url(#gradient-aek)');

    legend.append('text')
      .attr('x', 25)
      .attr('y', 10)
      .text('AEK')
      .style('font-size', '12px')
      .style('fill', '#9ca3af');

    legend.append('rect')
      .attr('y', 20)
      .attr('width', 20)
      .attr('height', 12)
      .attr('fill', 'url(#gradient-real)');

    legend.append('text')
      .attr('x', 25)
      .attr('y', 30)
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
