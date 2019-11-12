/* eslint-disable prefer-arrow-callback */
/* eslint-disable no-use-before-define */
/* eslint-disable no-unused-vars */
/* eslint-disable linebreak-style */
// import _ from 'lodash';
// import * as d3 from 'd3';
// import myData from './components/data.json';

function main(htmlElement, myData, d3, _) {
  const r = 5;
  const fontSize = 12;
  const domainFontSize = 16;
  const ySpace = 35; // label space
  const lineStrokeWidth = 3;
  const truncateLength = 20;
  const margin = {
    top: 50,
    right: 60,
    bottom: 30,
    left: 200,
  };
  const lineStroke = 'grey';
  const circleFill = 'grey';
  const pinFill = 'white';

  d3.select(htmlElement)
    .append('div')
    .attr('class', 'tooltip')
    .style('opacity', 0);

  const svg = d3.select(htmlElement)
    .append('svg')
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)
    .attr('class', 'timelineChart');


  // clipPath: not paint everything outside this area
  svg
    .append('defs')
    .append('svg:clipPath')
    .attr('id', 'clip')
    .append('svg:rect')
    .attr('width', 10)
    .attr('height', 10)
    .attr('x', -r)
    .attr('y', -r);


  svg.append('g')
    .attr('class', 'timelineXAxis');

  // create brush element
  const brushSVG = svg
    .append('g')
    .attr('class', 'brush');

  const fData = transformedData(myData)
    .filter(timeline => !timeline.belongTo);

  const maxMoment = d3.max(
    fData
      .map(el => el.observationData)
      .flat()
      .map(el => el.endMoment),
  );

  const minMoment = 0;

  updateData(fData);

  function transformedData(data) {
    const tData = _.transform(
      data,
      // eslint-disable-next-line no-unused-vars
      (accumulator, item, index, originalArr) => {
        const { domain } = item;
        const { conceptId } = item;
        const { conceptName } = item;
        const { startDay } = item;
        const { endDay } = item;

        const observationData = {
          startMoment: startDay,
          endMoment: endDay,
          conceptId,
          conceptName,
          domain,
        };

        const timeLineDomain = {
          label: domain,
          id: domain,
          observationData: [observationData],
          belongTo: null,
        };

        const timeLine = {
          label: conceptName,
          id: conceptId,
          observationData: [observationData],
          belongTo: domain,
        };

        // push timeline for domain
        const timeLineDomainIndex = accumulator.findIndex(
          el => el.id === domain,
        );
        if (timeLineDomainIndex > -1) {
          accumulator[timeLineDomainIndex].observationData.push(
            observationData,
          );
        } else {
          accumulator.push(timeLineDomain);
        }

        // push timeline for concept
        const timeLineIndex = accumulator.findIndex(
          el => el.id === conceptId && el.belongTo === domain,
        );

        if (timeLineIndex > -1) {
          accumulator[timeLineIndex].observationData.push(observationData);
        } else {
          accumulator.push(timeLine);
        }
      },
      [],
    );
    return tData;
  }


  function updateData(filteredData) {
    // calculate height and width
    const height = filteredData.length * ySpace;
    const width = document.getElementById('app').offsetWidth - margin.left - margin.right;

    d3.select('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);


    const xScale = d3.scaleLinear()
      .domain([minMoment, maxMoment])
      .range([0, width]);

    svg.select('.timelineXAxis')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale));

    svg
      .select('#clip rect')
      .attr('width', width)
      .attr('height', height);

    // brush
    const brush = d3.brushX()
      .extent([[0, -r], [width, height]])
      .on('end', handleBrush);

    brushSVG.call(brush);

    let idleTimeout;
    function idled() {
      idleTimeout = null;
    }
    function handleBrush() {
      const extent = d3.event.selection;
      if (!extent) {
        if (!idleTimeout) {
        // This allows to wait a little bit
          idleTimeout = setTimeout(idled, 350);
          return;
        }
        xScale.domain([minMoment, maxMoment]);
      } else {
        const extent0 = xScale.invert(extent[0]);
        const extent1 = xScale.invert(extent[1]);
        // console.log(extent0, extent1);
        xScale.domain([extent0, extent1]);
        svg.select('.brush').call(brush.move, null);
      }
      // update axis
      svg.select('.timelineXAxis')
        .call(d3.axisBottom(xScale));
      // update circles
      svg
        .selectAll('circle')
        .attr('cx', d => xScale(d.startMoment));

      // update lines
      svg
        .selectAll('.observationLine')
        .attr('x1', d => xScale(d.startMoment))
        .attr('x2', d => xScale(d.endMoment));
    }

    let timelineParent = svg
      .selectAll('.timelineParent')
      .data(filteredData, d => d.id);

    // remove a timeline
    // if not remove timelineChildren, they are still in memory even after being deleted
    timelineParent
      .exit()
      .select('.timelineChildren')
      .exit().remove();
    timelineParent.exit().remove();

    const timelineParentEnter = timelineParent
      .enter()
      .append('g')
      .attr('class', 'timelineParent')
      .attr('transform', (d, i) => `translate(${0},${i * ySpace})`);

    // timelineParentEnter.append('text')
    //   .attr('x', -margin.left + 5)
    //   .attr('dy', fontSize / 2)
    //   .attr('font-size', d => (!d.belongTo ? domainFontSize : fontSize))
    //   .attr('fill', pinFill)
    //   .attr('stroke', lineStroke)
    //   .attr('font-family', 'FontAwesome')
    //   .attr('class', 'pinIcon')
    //   .text('\uf08d');
    // timelineParentEnter.append('i')
    //   .attr('class', 'fa fa-fire');

    timelineParentEnter.append('text')
      .attr('class', 'label')
      .attr('font-size', d => (!d.belongTo ? domainFontSize : fontSize))
      .attr('font-family', '"Open Sans", sans-serif, FontAwesome')
      .attr('dy', fontSize / 3)
      .attr('x', -margin.left + truncateLength)
      .text(d => `${_.truncate(d.label, { length: truncateLength })} \uf107`) // only use if fontawesome is installed
      .style('text-anchor', 'start');


    // append timelineChildren to newly added timelinesParent
    timelineParentEnter.append('g')
      .attr('class', 'timelineChildren');
    // merge back to the timelineParent

    timelineParent = timelineParentEnter.merge(timelineParent);
    // update other timeline
    timelineParent
      .attr('transform', (d, i) => `translate(${0},${i * ySpace})`);

    // draw circles and lines
    const timelineChildren = timelineParent.select('.timelineChildren');

    // draw lines
    const lines = timelineChildren
      .selectAll('line')
      .data(d => d.observationData.filter(el => el.endMoment !== el.startMoment), d => d)
      .enter()
      .append('line')
      .attr('class', 'observationLine')
      .attr('x1', d => xScale(d.startMoment))
      .attr('x2', d => xScale(d.endMoment))
      .attr('stroke', lineStroke)
      .attr('stroke-width', lineStrokeWidth);
    lines.attr('clip-path', 'url(#clip)');
    // cicles
    const circles = timelineChildren
      .selectAll('circle')
      .data(d => d.observationData);

    circles
      .enter()
      .append('circle')
      .attr('cx', d => xScale(d.startMoment))
      .attr('fill', circleFill)
      .attr('r', r)
      .attr('width', 100)
      .attr('height', 100)
      .on('mouseover', (d) => {
        // display tooltip
        const timelineObservationData = filteredData
          .filter(el => !el.belongTo && (el.label === d.domain))[0];
        showTooltip(timelineObservationData, d);
      })
      .on('mouseout', () => {
        hideTooltip();
      });
    circles.attr('clip-path', 'url(#clip)');

    function getTooltipContent(timelineObservationData, dataPoint) {
      const tooltipContentList = [];
      timelineObservationData
        .filter(point => point.startMoment === dataPoint.startMoment)
        .forEach((point) => {
          const pointIndex = tooltipContentList.findIndex(
            p => p.startMoment === point.startMoment
              && p.endMoment === point.endMoment
              && p.conceptId === point.conceptId,
          );
          if (pointIndex > -1) {
            tooltipContentList[pointIndex].frequency += 1;
          } else {
            tooltipContentList.push({ ...point, frequency: 1 });
          }
        });
      let tooltipContent = '';
      tooltipContentList.forEach((content) => {
        const startEndDifferent = content.startMoment !== content.endMoment;
        tooltipContent
        += `<div style="margin-bottom:5px">
              <strong>${content.conceptId}</strong> <br />
              <span>Start day: ${content.startMoment} 
              ${
  startEndDifferent
    ? `- End day: ${content.endMoment}`
    : ''
}
            </span>, 
              <span>Frequency: ${content.frequency} </span>
            </div>`;
      });
      return tooltipContent;
    }
    function showTooltip(timeLineData, d) {
      const tooltipContent = getTooltipContent(timeLineData.observationData, d);
      const tooltip = d3.select('.tooltip');
      tooltip
        .transition()
        .duration(100)
        .style('opacity', 1);

      tooltip.html(tooltipContent);

      const tooltipSize = tooltip.node().getBoundingClientRect();
      tooltip
        .style('left', `${d3.event.pageX - tooltipSize.width / 2}px`)
        .style('top', `${d3.event.pageY + 5}px`);
    }

    function hideTooltip() {
      const tooltip = d3.select('.tooltip');
      tooltip
        .transition()
        .duration(0)
        .style('opacity', 0);
    }
  }
}
export default main;
