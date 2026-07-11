// Minimal d3 surface — only the submodules the charts actually use, instead of
// pulling the full `d3` meta-package. Charts keep using `d3.foo(...)` by doing
// `import * as d3 from '../../utils/d3'`.
//
// NOTE: `import 'd3-transition'` is a side-effect import — it augments the
// d3-selection prototype with `.transition()`, `.duration()`, `.delay()`,
// `.ease()`. Without it the animated charts would throw. Do not remove.
import 'd3-transition';

export { select } from 'd3-selection';
export { line, area, arc, pie, curveMonotoneX } from 'd3-shape';
export { scaleLinear, scalePoint, scaleOrdinal, scaleBand } from 'd3-scale';
export { axisLeft, axisBottom } from 'd3-axis';
export { max, sum } from 'd3-array';
export { interpolate } from 'd3-interpolate';
export { easeLinear, easeCubicOut } from 'd3-ease';
