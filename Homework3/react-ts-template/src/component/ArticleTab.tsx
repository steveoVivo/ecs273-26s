import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import { isEmpty, debounce } from 'lodash';

import { Bar, ComponentSize, Margin, TickerPoint } from '../types';
import Filenames from '../../data/stocknews/filenames.json'

const dataLocation = "../../data/stocknews";


const margin = { left: 40, right: 20, top: 20, bottom: 60 } as Margin;
  
// TODO: Control + f "bar" and replace it with "line"
export function ArticleTab() {

  // ----------> Instance Variables <----------
  // Ref for outer HTML object
  const containerRef = useRef<HTMLDivElement>(null);
  // State for Article Titles
  const [titles, setTitles] = useState<string[]>([]);
  // State for Article Content
  const [articleIndex, setArticleIndex] = useState<number>(-1);
  const [articleContent, setArticleContent] = useState<string[]>([]);

  // Easier to work with if I type it like this
  const filenameDict: Record<string, string[]> = Filenames as Record<string, string[]>;

  console.log(titles);



  // ----------> Draw: Retrieve Article Content (if relevant) <----------
  if (articleIndex != -1 && articleContent.length == 0) {
    const categorySelect = d3.select('#bar-select');
    const ticker = categorySelect.property('value');
    const articleTitle = filenameDict[ticker][articleIndex];

    // TODO: I think maybe something is causing this to forever loop when you pick an article - double check it
    d3.text(dataLocation + '/' + ticker + '/' + articleTitle)
      .then((text: string) => {
        let textArray: string[] = text.split(/\n+/);
        textArray = textArray.slice(3);
        textArray = textArray.filter((paragraph: string) => paragraph != "Oops, something went wrong")
        setArticleContent(textArray);
      })
      .catch(err => {
        console.log('Error Retrieving text');
        setArticleContent(['Invalid content']);
      })
  }

  useEffect(() => {
    // TODO: Handle when there is no news (As there is for MMM)
    // NOTE: This should always be called after mount, but it'll completely break if this is the case
    if (!containerRef.current) return;

    const categorySelect = d3.select('#bar-select');

    // ----------> Handle: Changing Selected ticker <----------
    // Get initial ticker
    const initialSelected = categorySelect.property('value');
    setTitles(filenameDict[initialSelected] ?? []);

    // Get ticker when changed
    categorySelect
      .on('change', function(event) {
        const ticker = event.target.value;
        setTitles(filenameDict[ticker] ?? []);
      });



    // TODO: You actually might not need this anymore
    // ----------> Draw: Every Page Resize <----------
    const resizeObserver = new ResizeObserver(
      debounce((entries: ResizeObserverEntry[]) => {
        for (const entry of entries) {
          // TODO: This line is pointless, delete it if you bring back the observer
          continue;
          // if (entry.target !== containerRef.current) continue;
          // const { width, height } = entry.contentRect as ComponentSize;
          // if (width && height && !isEmpty(currentData)) {
            // drawChart(svgRef.current!, currentData, width, height);
          // }
        }
      }, 100)
    );

    // resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  /* --- No Existing Articles View --- */
  if (titles.length == 0) {
    return (
      <div className="grid auto-rows-fr h-full w-full" ref={containerRef}>
        <div className="text-center"> No articles to display for current ticker.</div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full" style={{ width: '100%', height: '100%' }} ref={containerRef}>
      {/* --- All Articles View --- */
      (articleIndex == -1) 
        ? <div className="h-full flex flex-col overflow-y-auto">
          {titles.map((text, index) => (
            // Background color is slate-300, the webpage itself uses slate-200
            <div className="max-h-[100px] flex-shrink-0 text-xl font-bold p-2 m-2 overflow-hidden line-clamp-3 border rounded-sm bg-slate-300 hover:bg-slate-100 cursor-pointer" 
              key={index} onClick={_ => setArticleIndex(index)}> 
              {cleanTitle(text)}
            </div>
          ))}
        </div>
        /* --- One Article View --- */
        : <div className="h-full flex flex-col overflow-y-auto">
          <div className="text-xl font-bold p-2 m-2 border rounded-sm bg-slate-300 hover:bg-slate-100 cursor-pointer" 
            onClick={_ => {setArticleIndex(-1); setArticleContent([])}}> 
            {cleanTitle(titles[articleIndex])}
          </div>
          {articleContent.map((text, index) => (
            <div key={index}> {text} </div>
          ))}
        </div>
      }
    </div>
  );
}

function cleanTitle(title: string): string {
  return title
    .replace(/^[\d_\- ]+/, "") // Replace date / whitespace at string start
    .replace(/\.txt$/, ""); // Replace stock extension at string end
}