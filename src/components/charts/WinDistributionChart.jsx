import { useEffect, useRef } from 'react';
import * as d3 from '../../utils/d3';

/**
 * Interactive Donut Chart for win distribution
 * Features: Animated arcs, hover effects, percentage labels
 */
export default function WinDistributionChart({ data, height = 350, title = "Siegesverteilung" }) {
  const svgRef = useRef();
  const tooltipRef = useRef();
  const containerRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove();
    
    const container = containerRef.current;
    const platz = svgRef.current.parentElement?.clientWidth || container.clientWidth;
    const schmal = platz < 420;
    const width = Math.min(platz, schmal ? platz : height);
    // Schmal: Kreis kleiner, damit unter ihm Platz fuer die Legende bleibt.
    const radius = (schmal ? Math.min(width, height) / 2 - 62 : Math.min(width, height) / 2 - 40);
    // Hoehe waechst um die Legendenzeilen, sonst wird sie unten abgeschnitten.
    const hoehe = schmal ? height + data.length * 25 + 16 : height;

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', hoehe)
      .append('g')
      .attr('transform', `translate(${width / 2},${schmal ? radius + 16 : height / 2})`);

    // Create color scale
    const colorScale = d3.scaleOrdinal()
      .domain(data.map(d => d.label))
      .range(['#3b82f6', '#ef4444', '#10b981']);

    // Create pie layout
    const pie = d3.pie()
      .value(d => d.value)
      .sort(null);

    // Create arc generator
    const arc = d3.arc()
      .innerRadius(radius * 0.6)
      .outerRadius(radius);

    const arcHover = d3.arc()
      .innerRadius(radius * 0.6)
      .outerRadius(radius + 10);

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

    // Calculate total
    const total = d3.sum(data, d => d.value);

    // Add arcs with animation
    const arcs = svg.selectAll('.arc')
      .data(pie(data))
      .enter()
      .append('g')
      .attr('class', 'arc');

    arcs.append('path')
      .attr('d', arc)
      .attr('fill', d => colorScale(d.data.label))
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .style('opacity', 0)
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', arcHover)
          .style('opacity', 0.8);
        
        const percentage = ((d.data.value / total) * 100).toFixed(1);
        tooltip
          .style('visibility', 'visible')
          .html(`
            <div style="font-weight: bold; margin-bottom: 4px;">${d.data.label}</div>
            <div>Anzahl: ${d.data.value}</div>
            <div>Anteil: ${percentage}%</div>
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
          .attr('d', arc)
          .style('opacity', 1);
        
        tooltip.style('visibility', 'hidden');
      })
      .transition()
      .duration(1000)
      .delay((d, i) => i * 200)
      .ease(d3.easeCubicOut)
      .style('opacity', 1)
      .attrTween('d', function(d) {
        const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return function(t) {
          return arc(interpolate(t));
        };
      });

    // Add percentage labels
    arcs.append('text')
      .attr('transform', d => {
        const [x, y] = arc.centroid(d);
        return `translate(${x}, ${y})`;
      })
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .style('fill', 'white')
      .style('opacity', 0)
      .text(d => {
        const percentage = ((d.data.value / total) * 100);
        return percentage >= 5 ? `${percentage.toFixed(0)}%` : '';
      })
      .transition()
      .duration(1000)
      .delay(1200)
      .style('opacity', 1);

    // Add center text with total
    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.2em')
      .style('font-size', '28px')
      .style('font-weight', 'bold')
      .style('fill', '#374151')
      .style('opacity', 0)
      .text(total)
      .transition()
      .duration(800)
      .delay(1000)
      .style('opacity', 1);

    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.2em')
      .style('font-size', '14px')
      .style('fill', '#9ca3af')
      .style('opacity', 0)
      .text('Gesamt')
      .transition()
      .duration(800)
      .delay(1200)
      .style('opacity', 1);

    // Legende: auf breiten Schirmen rechts neben dem Kreis, auf schmalen
    // DARUNTER. Rechts danebengesetzt ragten Zeilen wie "AEK Athen Siege: 1"
    // weit ueber die SVG-Breite hinaus und schoben auf dem Handy die ganze
    // Seite seitlich weg — der Text wird ja nicht vom SVG beschnitten.
    const legend = svg.append('g')
      .attr('transform', schmal
        ? `translate(${-radius}, ${radius + 24})`
        : `translate(${radius + 20}, ${-radius + 20})`);

    data.forEach((d, i) => {
      const legendRow = legend.append('g')
        .attr('transform', `translate(0, ${i * 25})`);

      legendRow.append('rect')
        .attr('width', 18)
        .attr('height', 18)
        .attr('rx', 3)
        .attr('fill', colorScale(d.label))
        .style('opacity', 0)
        .transition()
        .duration(500)
        .delay(1400 + i * 100)
        .style('opacity', 1);

      legendRow.append('text')
        .attr('x', 25)
        .attr('y', 13)
        .text(`${d.label}: ${d.value}`)
        .style('font-size', '12px')
        .style('fill', '#374151')
        .style('opacity', 0)
        .transition()
        .duration(500)
        .delay(1400 + i * 100)
        .style('opacity', 1);
    });

  }, [data, height]);

  return (
    <div ref={containerRef} className="w-full">
      <h3 className="text-lg font-semibold mb-4 text-text-primary text-center">{title}</h3>
      <div className="bg-bg-elevated dark:bg-gray-800 rounded-lg p-4 shadow-sm flex justify-center">
        <svg ref={svgRef}></svg>
        <div ref={tooltipRef}></div>
      </div>
    </div>
  );
}
