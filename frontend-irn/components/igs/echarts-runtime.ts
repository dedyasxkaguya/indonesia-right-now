import * as echarts from 'echarts/core';
import {
  BarChart,
  BoxplotChart,
  CustomChart,
  FunnelChart,
  GaugeChart,
  GraphChart,
  HeatmapChart,
  LineChart,
  MapChart,
  ParallelChart,
  RadarChart,
  SankeyChart,
  ScatterChart,
  SunburstChart,
  TreemapChart,
} from 'echarts/charts';
import {
  GeoComponent,
  GridComponent,
  LegendComponent,
  ParallelComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';

echarts.use([
  BarChart,
  BoxplotChart,
  CustomChart,
  FunnelChart,
  GaugeChart,
  GeoComponent,
  GraphChart,
  GridComponent,
  HeatmapChart,
  LegendComponent,
  LineChart,
  MapChart,
  ParallelChart,
  ParallelComponent,
  RadarChart,
  SankeyChart,
  ScatterChart,
  SunburstChart,
  SVGRenderer,
  TooltipComponent,
  TreemapChart,
  VisualMapComponent,
]);

export { echarts };
