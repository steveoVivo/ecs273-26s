import * as d3 from "d3";
import { useEffect, useRef } from "react";
import { isEmpty, debounce } from 'lodash';

import { Bar, ComponentSize, Margin, TickerPoint } from '../types';

const dataLocation = "../../data/stockdata";

interface DataPoint extends Bar {
  date: Date;
}

type ColorValue = {
  value: keyof TickerPoint;
  color: string;
}

const margin = { left: 40, right: 20, top: 20, bottom: 60 } as Margin;
  
// TODO: Control + f "bar" and replace it with "line"
export function LineChart() {
  let currentData: TickerPoint[] = []

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    // NOTE: This should always be called after mount, but it'll completely break if this is the case
    if (!containerRef.current || !svgRef.current) return;

    const categorySelect = d3.select('#bar-select');

    // ----------> Draw: Initial Draw <----------
    const initialSelected = categorySelect.property('value');
    const fileLocation = dataLocation + "/" + initialSelected + ".csv";
    d3.csv(fileLocation).then((data: any[]) => {
      currentData = cleanTickerData(data);

      // We assert at the start of the useEffect that there is a value in current
      const { width, height } = (containerRef.current!).getBoundingClientRect();
      if (width && height) {
        drawChart(svgRef.current!, currentData, width, height);
      }
    }).catch(error => {
      console.error("Error: ", error);
    });


    // ----------> Draw: When Selection Changes <----------
    // TODO: Consider if you should debounce this
    categorySelect
      .on('change', function(event) {
        const ticker = event.target.value;
        const fileLocation = dataLocation + "/" + ticker + ".csv";
        d3.csv(fileLocation).then((data: any[]) => {
          currentData = cleanTickerData(data);

          // We assert at the start of the useEffect that there is a value in current
          const { width, height } = (containerRef.current!).getBoundingClientRect();
          if (width && height) {
            drawChart(svgRef.current!, currentData, width, height);
          }
        });
      });


    // ----------> Draw: Every Page Resize <----------
    const resizeObserver = new ResizeObserver(
      debounce((entries: ResizeObserverEntry[]) => {
        for (const entry of entries) {
          if (entry.target !== containerRef.current) continue;
          const { width, height } = entry.contentRect as ComponentSize;
          if (width && height && !isEmpty(currentData)) {
            drawChart(svgRef.current!, currentData, width, height);
          }
        }
      }, 100)
    );

    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  // TODO: Eventually it would be good not to hardcode this, thought not necessary
  const colorData: ColorValue[] = ['open', 'high', 'low', 'close'].map((tickerKey: string) => {
    return {
      value: tickerKey as keyof TickerPoint,
      color: getColorFromColumn(tickerKey as keyof TickerPoint)
    }
  });

  return (
    <div className="flex w-full h-full" style={{ width: '100%', height: '100%' }}>
      <div className="flex-1 p-4 h-full" ref={containerRef}>
        <svg id="bar-svg" ref={svgRef} width="100%" height="100%"></svg>
      </div>
      <div className="w-[200px] flex-none p-4 h-35">
        <div className="grid auto-rows-fr h-full border">
          <div className="border font-bold text-center">Legend</div>
          {
          colorData.map((data, index) => (
            <div className="flex items-center" key={index}>
              <div className="h-[50%] w-[20px] m-[2px] border" style={{ backgroundColor: data.color}}></div>
              <div className="h-full mb-[5px]"> {data.value} </div>
            </div>
          ))
          }
        </div>
      </div>
    </div>
  );
}

function drawChart(svgElement: SVGSVGElement, points: TickerPoint[], width: number, height: number) {

  // TODO: Error handle better with tis guy
  if(points.length < 2) {
    return;
  }

  const svg = d3.select(svgElement);
  svg.selectAll('*').remove(); // clear previous render

  // ----------> Calculate X-Values <----------
  // TODO: we need to ensure there will always be at least 2 data points
  const xExtents = d3.extent(points.map(point => point.date)) as [Date, Date];
  const xScale = d3.scaleTime()
    .domain(xExtents)
    .rangeRound([margin.left, width - margin.right])

  // ----------> Calculate Y-Values <----------
  const maxValue = Math.max(
    ...points.map(point => point.open),
    ...points.map(point => point.high),
    ...points.map(point => point.low),
    ...points.map(point => point.close)
  ) * 1.1;
  const minValue = Math.min(
    ...points.map(point => point.open),
    ...points.map(point => point.high),
    ...points.map(point => point.low),
    ...points.map(point => point.close)
  ) * 0.9;
  // Add an extra 10% to the top and bottom of the chart, so the highest point isn't scraping the ceiling and the lowest isn't 0
  const yScale = d3.scaleLinear()
    .domain([minValue, maxValue])
    .range([height - margin.bottom, margin.top])

  // xAxis Scaling
  const xAxis = svg.append('g')
    .attr('transform', `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(xScale))
  // yAxis Scaling
  const yAxis = svg.append('g')
    .attr('transform', `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(yScale));
  // Line generator
  const dataLine = d3.line<DataPoint>()
    .x(p => xScale(p.date))
    .y(p => yScale(p.value));



  // ----------> Create Path Elements <----------
  const tickerPointKeys: string[] = Object.keys(points[0]);
  const paths: d3.Selection<SVGPathElement, DataPoint[], null, undefined>[] = [];
  tickerPointKeys.forEach((key: string) => {
    // It's bad form to reference it like this but that's okay for this assignment
    if (key == 'date') return;
    const dataPoints: DataPoint[] = points.map((point: TickerPoint) => {
      return {
        date: point['date'],
        // We know for sure that this will work, but it's a hacky fix
        value: point[key as keyof TickerPoint] as number
      }
    });

    const color = getColorFromColumn(key as keyof TickerPoint);
    const path = svg.append("path")
      .datum(dataPoints)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 0.25)
      .attr("d", dataLine)

    paths.push(path);
  });



  // ----------> Add Zoom Functionality <----------
  const zoomFunction = (event: any) => {
    // Redraw x-scale
    const xTicks = event.transform.rescaleX(xScale);
    xAxis.call(d3.axisBottom(xTicks));
    // Redraw lines
    paths.forEach(path => {
      path.attr("d", dataLine.x(d => xTicks(d.date)));
    });
  }

  const zoomAction: any = d3.zoom()
    .scaleExtent([1, 80]) // One week of data at max zoom for 2yr
    .translateExtent([[0, 0], [width, height]]) 
    .on("zoom", zoomFunction);

  svg.call(zoomAction);



  // ----------> Prevent Clipping <----------
  const clipPath = svg.append("defs")
    .append("clipPath")
    .attr("id", "line-chart-clip-path")

  // Make sure the clip starts after the y-scale and ends w the svg
  // x/width are most important, it just fails without y/height
  clipPath.append("rect")
    .attr("width", width - margin.right - margin.left)
    .attr("height", height - margin.top - margin.bottom)
    .attr("x", margin.left)
    .attr("y", margin.top);

  // Give the path object a limited non-clipping area
  paths.forEach(path => {
    path.attr("clip-path", "url(#line-chart-clip-path)");
  });
}

function cleanTickerData(rawData: any[]): TickerPoint[] {
  // TODO: Consider adding a try/catch for invalid dates or data
  return rawData.map((tickerData: any) => {
    return {
      date: new Date(tickerData['Date']),
      open: Number(tickerData['Open']),
      high: Number(tickerData['High']),
      low: Number(tickerData['Low']),
      close: Number(tickerData['Close'])
    }
  });
}

// Color palette generated from:
// https://www.learnui.design/tools/data-color-picker.html
function getColorFromColumn(selectedCategory: keyof TickerPoint): string {
  switch (selectedCategory) {
    case 'open':
      return '#003f5c';
    case 'high':
      return '#bb4e99';
    case 'low':
      return '#ff5f68';
    case 'close':
      return '#ffa600';
  }

  // Equivalent to defaulting
  return '#575092';
}