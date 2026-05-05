import * as d3 from "d3";
import { useEffect, useRef } from "react";
import { isEmpty, debounce } from 'lodash';
import Data from "../../data/demo.json";

import { Bar, ComponentSize, Margin } from '../types';

const dataLocation = "../../data/stockdata";

// A "extends" B means A inherits the properties and methods from B.
interface CategoricalBar extends Bar {
    category: string;
}

const margin = { left: 40, right: 20, top: 20, bottom: 60 } as Margin;
  
export function LineChart() {
  const barData: CategoricalBar[] = [];

  // -------------> Data Retrieval Code
  // TODO: Consider using some kind of filesystem if possible to grab all the tickers instead of from the .json file
  const tickers: string[] = (Data.data).map(data => data.category);

  tickers.forEach((ticker: string) => {
    barData.push({
      value: 0,
      category: ticker
    });
  })

  // TODO: You need to find a better way to do this. Using an array of promises is just a mess
  tickers.forEach((ticker: string) => {
    const fileLocation = dataLocation + "/" + ticker + ".csv";
    d3.csv(fileLocation).then((data: any[]) => {
      // TODO: Stress test by manually messing with data to see what happens when date is invalid. Might need a try / catch
      const cleanedData = data.map(stock => {
        stock['Date'] = new Date(stock['Date']);
        return stock;
      });
      const newestStock = cleanedData.reduce((stock, nextStock) => {
        return stock['Date'] > nextStock['Date'] ? stock : nextStock
      });

      // TODO: Error handle for idx == -1 (or whatever unfound returns)
      const idx: number = barData.findIndex(bar => bar.category == ticker);
      barData[idx] = {
        value: newestStock['Open'],
        category: ticker
      }

    }).catch(error => {
      console.error("Error: ", error);
    });
  });

  // -------------> Rendering Code
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  // const bars: CategoricalBar[] = Data.data;

  useEffect(() => {
    if (!containerRef.current || !svgRef.current) return;

    const resizeObserver = new ResizeObserver(
      debounce((entries: ResizeObserverEntry[]) => {
        for (const entry of entries) {
          if (entry.target !== containerRef.current) continue;
          const { width, height } = entry.contentRect as ComponentSize;
          if (width && height && !isEmpty(barData)) {
            drawChart(svgRef.current!, barData, width, height);
          }
        }
      }, 100)
    );

    resizeObserver.observe(containerRef.current);

    // Draw initially based on starting size
    const { width, height } = containerRef.current.getBoundingClientRect();
    if (width && height) {
      drawChart(svgRef.current!, barData, width, height);
    }

    console.log(barData);

    return () => resizeObserver.disconnect();
  }, [barData]);

  

  return (
    <div className="chart-container d-flex" ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <svg id="bar-svg" ref={svgRef} width="100%" height="100%"></svg>
    </div>
  );
}

function drawChart(svgElement: SVGSVGElement, bars: CategoricalBar[], width: number, height: number, ) {
    const svg = d3.select(svgElement);
    svg.selectAll('*').remove(); // clear previous render

    const yExtents = d3.extent(bars.map((d) => d.value)) as [number, number];
    const xCategories = [...new Set(bars.map((d) => d.category))];

    const xScale = d3.scaleBand()
        .rangeRound([margin.left, width - margin.right])
        .domain(xCategories)
        .padding(0.1);

    const yScale = d3.scaleLinear()
        .range([height - margin.bottom, margin.top])
        .domain([0, yExtents[1]]);
    
    

    svg.append('g')
        .attr('transform', `translate(0, ${height - margin.bottom})`)
        .call(d3.axisBottom(xScale))
    svg.append('g')
        .attr('transform', `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(yScale));

    svg.append('g')
        .attr('transform', `translate(10, ${height / 2}) rotate(-90)`)
        .append('text')
        .text('Value')
        .style('font-size', '.8rem');

    svg.append('g')
        .attr('transform', `translate(${width / 2 - margin.left}, ${height - margin.top - 5})`)
        .append('text')
        .text('Categories')
        .style('font-size', '.8rem');

    svg.append('g')
        .selectAll('rect')
        .data(bars)
        .join('rect')
        .attr('x', (d) => xScale(d.category)!)
        .attr('y', (d) => yScale(d.value))
        .attr('width', xScale.bandwidth())
        .attr('height', (d) => Math.abs(yScale(0) - yScale(d.value)))
        .attr('fill', 'teal')
        .attr('class', 'bar')
        .attr('id', (d) => `bar-${d.category}`);

    svg.append('g')
        .append('text')
        .attr('transform', `translate(${width / 2}, ${height - margin.top + 5})`)
        .attr('dy', '0.5rem')
        .style('text-anchor', 'middle')
        .style('font-weight', 'bold')
        .text('Distribution of Demo Data');
    const categorySelect = d3.select('#bar-select');

    // call it once initially
    const initialSelected = categorySelect.property('value');
    console.log('Initial Selected: ' + initialSelected);
    highlightBar(initialSelected);
    
    // change when the select changes
    categorySelect
      .on('change', function(event) {
        const selectedCategory = event.target.value;
        highlightBar(selectedCategory);

      })
}

function highlightBar(selectedCategory: string) {
  // 1. First, reset all bars back to normal
  d3.selectAll('.bar')
    .attr('fill', 'pink'); // whatever your default color is
  // 2. Then highlight the selected bar
  d3.select(`#bar-${selectedCategory}`)
    .attr('fill', 'yellow'); // or any color you like
}