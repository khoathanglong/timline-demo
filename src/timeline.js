/* eslint-disable prefer-arrow-callback */
/* eslint-disable no-use-before-define */
/* eslint-disable no-unused-vars */
/* eslint-disable linebreak-style */
// import _ from 'lodash';
// import * as d3 from 'd3';
// import rawData from './components/data.json';

// rawData: Data from UCB atlas
// htmlElement: Element that contain the chart
// _ : lodash
import { schemeCategory10 } from 'd3-scale-chromatic';
import _ from 'lodash';

class Timeline {
  svg;

  brush;

  brushed;

  xScale;


  r = 5;

  fontSize = 12;

  domainFontSize = 16;

  ySpace = 30;

  // label space
  lineStrokeWidth = 3;

  truncateLength = 20;

  margin = {
    top: 30,
    right: 60,
    bottom: 30,
    left: 200,
  };

  width = document.getElementById('app').offsetWidth - this.margin.left - this.margin.right;

  lineStroke = '#CDCDCD';

  circleFill = '#CDCDCD';

  pinFill = 'white';

  expandAllColor = '#467AB2';

  textFill = 'black';

  pinnedFill = 'blue';

  constructor(htmlElement, rawData, d3) {
    this.htmlElement = htmlElement;
    this.d3 = d3;
    this.filteredData = [];
    this.filterText = '';
    this.allExpanded = false;
    this.allData = this.transformedData(rawData);
    this.originalData = this.transformedData(rawData).filter(timeline => !timeline.belongTo);

    this.maxMoment = d3.max(
      this.allData
        .map(el => el.observationData)
        .flat()
        .map(el => el.endMoment),
    );

    this.minMoment = d3.min(
      this.allData
        .map(el => el.observationData)
        .flat()
        .map(el => el.startMoment),
    );
    this.implementColorScheme();
    this.implementFilter();
    this.implementExpandingAll();
    this.implementTooltip();
    this.initializeTimeline();
  }

  implementColorScheme() {
    this.colorScheme = this.d3
      .scaleOrdinal()
      .domain(this.allData.filter(el => !el.belongTo).map(el => el.id))
      .range(schemeCategory10);
  }

  implementFilter() {
    const input = this.d3
      .select(this.htmlElement)
      .append('div')
      .style('text-align', 'left')
      .attr('class', 'timelineFilter')
      .append('input')
      .attr('placeholder', 'Filter timeline');
    this.d3
      .select('.timelineFilter')
      .style('padding', `${this.margin.top / 2}px 0 0 ${this.margin.left}px`);
    input.on(
      'input',
      _.debounce(() => this.handleFilter(), 200),
    );
  }

  handleFilter() {
    this.filteredData.splice(0, this.filteredData.length);
    const inputVal = this.d3
      .select('div.timelineFilter')
      .select('input')
      .node()
      .value.trim();


    this.filterText = inputVal;

    if (inputVal === '') {
      this.handleCollapseAll();
    } else {
      const filteredData = this.allData.filter(
        el => el.belongTo && el.label.toLowerCase().includes(inputVal.toLowerCase()),
      );
      if (filteredData.length === 0) {
        this.filterText = '';
        this.handleCollapseAll();
        return;
      }
      this.handleExpandingAll();
    }
  }

  implementExpandingAll() {
    const div = this.d3
      .select(this.htmlElement)
      .append('div')
      .attr('class', 'expandingButton')
      .style('text-align', 'left')
      .style('color', this.expandAllColor)
      .style('padding', `${this.margin.top / 3}px 0 0 ${this.margin.left}px`);

    const expandText = div
      .append('text')
      .text('Expand all domains')
      .style('font-size', `${this.fontSize}px`);
    expandText.on('click', () => this.handleExpandingAll());
  }

  handleExpandingAll() {
    // prevent multi expanding
    // if (this.allExpanded) return;
    let expandedData;
    if (this.filterText) {
      expandedData = this.allData
        .filter(el => !el.belongTo || el.isPinned || (el.belongTo && el.label.toLowerCase().includes(this.filterText.toLowerCase())))
        .map((el) => {
          if (!el.belongTo && !el.expanded) return { ...el, expanded: true };
          return el;
        });
    } else {
      expandedData = this.allData.map((el) => {
        if (!el.belongTo) return { ...el, expanded: true };
        return el;
      });
    }
    this.originalData.splice(0, this.originalData.length, ...expandedData);

    this.drawTimeline(this.originalData);
    this.allExpanded = true;
  }

  handleCollapseAll() {
    _.remove(this.originalData, el => el.belongTo && !el.isPinned);
    // change domain expanded state
    for (let i; i < this.originalData.length; i += 1) {
      if (!this.originalData[i].belongTo) {
        this.originalData[i].expanded = false;
      }
    }
    this.drawTimeline(this.originalData);
  }

  implementTooltip() {
    this.d3
      .select(this.htmlElement)
      .append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0);
  }

  expandDomain(domain) {
    let expandedData;
    if (this.filterText) {
      expandedData = this.allData
        .filter(el => el.belongTo === domain.label)
        .filter(el => el.isPinned || (el.belongTo && el.label.toLowerCase().includes(this.filterText.toLowerCase())));
    } else {
      expandedData = this.allData.filter(el => el.belongTo === domain.label);
    }
    const domainIndex = this.originalData.findIndex(el => el.label === domain.label);
    this.originalData[domainIndex].expanded = true;
    // calculate length of current expanding concepts
    const domainConceptsLength = this.originalData.filter(el => el.belongTo === domain.label).length;
    this.originalData.splice(domainIndex + 1, domainConceptsLength, ...expandedData);
    this.drawTimeline(this.originalData);
  }

  closeDomain(domain) {
    const domainIndex = this.originalData.findIndex(el => el.label === domain.label);
    this.originalData[domainIndex].expanded = false;
    const closingLength = this.originalData.filter(el => el.belongTo === domain.label).length;
    const existingElement = this.originalData.filter(el => el.belongTo === domain.label && el.isPinned);
    // _.remove(this.originalData, el => el.belongTo === domain.label && !el.isPinned);
    this.originalData.splice(domainIndex + 1, closingLength, ...existingElement);
    this.drawTimeline(this.originalData);
  }


  initializeTimeline() {
    this.svg = this.d3
      .select(this.htmlElement)
      .append('svg')
      .append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`)
      .attr('class', 'timelineChart');

    this.svg
      .append('defs')
      .append('svg:clipPath')
      .attr('id', 'clip')
      .append('svg:rect')
      .attr('width', 10)
      .attr('height', 10)
      .attr('x', -this.r)
      .attr('y', -this.r);
    // create xAxis
    this.svg.append('g').attr('class', 'timelineXAxis');

    this.xScale = this.d3
      .scaleLinear()
      .domain([this.minMoment, this.maxMoment])
      .range([0, this.width]);

    this.svg
      .select('.timelineXAxis')
      .call(this.d3.axisBottom(this.xScale));
    // create brush
    this.brush = this.svg.append('g').attr('class', 'brush');

    this.drawTimeline(this.originalData);
  }

  resetBrush() {
    this.svg.select('.brush').call(this.brushed.move, null);
    this.xScale.domain([this.minMoment, this.maxMoment]);
    this.svg.select('.timelineXAxis').call(this.d3.axisBottom(this.xScale));
    // update circles
    this.svg.selectAll('circle').attr('cx', d => this.xScale(d.startMoment));

    // update lines
    this.svg
      .selectAll('.observationLine')
      .attr('x1', d => this.xScale(d.startMoment))
      .attr('x2', d => this.xScale(d.endMoment));
  }

  drawTimeline(chartData) {
    // reset brushed if exists
    if (this.brushed) {
      this.resetBrush();
    }
    if (this.allExpanded) {
      this.allExpanded = false;
    }
    // (re)calculate height and width
    const height = chartData.length * this.ySpace;

    // re-assign height and width
    this.d3
      .select('svg')
      .attr('width', this.width + this.margin.left + this.margin.right)
      .attr('height', height + this.margin.top + this.margin.bottom);

    // (re)calculate axis

    this.svg
      .select('.timelineXAxis')
      .attr('transform', `translate(0,${height})`);

    // (re)calculate clip path
    this.svg
      .select('#clip rect')
      .attr('width', this.width)
      .attr('height', height);

    // to handle reset brush
    let idleTimeout;
    function idled() {
      idleTimeout = null;
    }
    // (re)apply brush
    this.brushed = this.d3
      .brushX()
      .extent([
        [0, -this.r],
        [this.width, height],
      ])
      .on('end', () => {
        const extent = this.d3.event.selection;
        if (!extent) {
          if (!idleTimeout) {
            // This allows to wait a little bit
            idleTimeout = setTimeout(idled, 350);
            return;
          }
          this.xScale.domain([this.minMoment, this.maxMoment]);
        } else {
          const extent0 = this.xScale.invert(extent[0]);
          const extent1 = this.xScale.invert(extent[1]);
          this.xScale.domain([extent0, extent1]);
          this.svg.select('.brush').call(this.brushed.move, null);
        }
        // update axis
        this.svg.select('.timelineXAxis').call(this.d3.axisBottom(this.xScale));
        // update circles
        this.svg.selectAll('circle').attr('cx', d => this.xScale(d.startMoment));

        // update lines
        this.svg
          .selectAll('.observationLine')
          .attr('x1', d => this.xScale(d.startMoment))
          .attr('x2', d => this.xScale(d.endMoment));
      });

    this.brush.call(this.brushed);


    let timelineParent = this.svg
      .selectAll('.timelineParent')
      .data(chartData, (d, i) => (d.belongTo ? d.label + d.belongTo + d.isPinned : d.label + d.expanded));


    // remove a timeline
    // if not remove timelineChildren, they are still in memory even after being deleted
    timelineParent
      .exit()
      .select('.timelineChildren')
      .exit()
      .remove();
    timelineParent.exit().remove();

    const timelineParentEnter = timelineParent
      .enter()
      .append('g')
      .attr('class', 'timelineParent')
      .attr('transform', (d, i) => `translate(${0},${i * 2})`);

    timelineParentEnter
      .append('text')
      .attr('font-size', d => (!d.belongTo ? this.domainFontSize : this.fontSize))
      .attr('class', 'fa')
      .attr('dy', this.fontSize / 3)
      .attr('x', d => (d.belongTo
        ? -this.margin.left + this.truncateLength + 10
        : -this.margin.left + this.truncateLength))
      .style('text-anchor', 'start');


    // append timelineChildren to newly added timelinesParent
    timelineParentEnter.append('g').attr('class', 'timelineChildren');
    // merge back to the timelineParent
    timelineParent = timelineParentEnter.merge(timelineParent);
    // update other timeline
    timelineParent.attr('transform', (d, i) => `translate(${0},${i * this.ySpace})`);

    timelineParent
      .select('text')
      .text((d) => {
        const label = _.truncate(d.label, { length: this.truncateLength });
        if (d.belongTo) {
          return `\uf08d ${label}`;
        }
        return d.expanded ? `${label} \uf106` : `${label} \uf107`;
      })
      .classed('domainLabel', d => !d.belongTo)
      .attr('fill', d => (d.isPinned ? this.pinnedFill : this.textFill))
      .on('click', (d, i) => {
        if (d.belongTo) {
          this.pinLabel(d, i);
        } else if (!d.belongTo && !d.expanded) {
          this.expandDomain(d);
        } else if (!d.belongTo && d.expanded) {
          this.closeDomain(d);
        }
      });


    // draw circles and lines
    const timelineChildren = timelineParent.select('.timelineChildren');
    timelineChildren.attr('clip-path', 'url(#clip)');

    // draw lines
    timelineChildren
      .selectAll('line')
      .data(d => d.observationData.filter(el => el.endMoment !== el.startMoment))
      .enter()
      .append('line')
      .attr('class', 'observationLine')
      .attr('x1', d => this.xScale(d.startMoment))
      .attr('x2', d => this.xScale(d.endMoment))
      .attr('stroke', d => (d.inDomainLine ? this.lineStroke : this.colorScheme(d.conceptId)))
      .attr('stroke-width', this.lineStrokeWidth);

    // cicles
    const circles = timelineChildren.selectAll('circle').data(d => d.observationData);

    circles
      .enter()
      .append('circle')
      .attr('cx', d => this.xScale(d.startMoment))
      .attr('fill', d => (d.inDomainLine ? this.circleFill : this.colorScheme(d.conceptId)))
      .attr('r', this.r)
      .attr('width', 100)
      .attr('height', 100)
      .on('mouseover', (d) => {
        // display tooltip
        const singleTimelineData = chartData.filter(el => (d.inDomainLine
          ? el.label === d.domain
          : el.label === d.conceptName && d.domain === el.belongTo))[0];
        this.showTooltip(singleTimelineData, d);
      })
      .on('mouseout', () => {
        this.hideTooltip();
      });
  }

  pinLabel(d) {
    // const pinnedDataIndex = this.pinnedData.findIndex(
    //   el => el.id === d.id && el.belongTo === d.belongTo,
    // );
    const originalDataIndex = this.originalData.findIndex(
      el => el.id === d.id && d.belongTo === el.belongTo,
    );
    const allDataIndex = this.allData.findIndex(
      el => el.id === d.id && el.belongTo === d.belongTo,
    );
    this.allData[allDataIndex].isPinned = !d.isPinned;
    this.originalData[originalDataIndex].isPinned = !d.isPinned;
    this.drawTimeline(this.originalData);
  }

  showTooltip(timeLineData, d) {
    const tooltipContent = this.getTooltipContent(timeLineData.observationData, d);

    const tooltip = this.d3.select('.tooltip');
    tooltip
      .transition()
      .duration(100)
      .style('opacity', 1);

    tooltip.html(tooltipContent);

    const tooltipSize = tooltip.node().getBoundingClientRect();
    tooltip
      .style('left', `${this.d3.event.pageX - tooltipSize.width / 2}px`)
      .style('top', `${this.d3.event.pageY + 5}px`);
  }

  hideTooltip() {
    const tooltip = this.d3.select('.tooltip');
    tooltip
      .transition()
      .duration(0)
      .style('opacity', 0);
  }

  getTooltipContent(timelineObservationData, dataPoint) {
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
      tooltipContent += `<div style="margin-bottom:5px">
            <strong>${content.conceptId}</strong> <br />
            <span>Start day: ${content.startMoment} ${
  startEndDifferent ? `- End day: ${content.endMoment}` : ''
}
          </span>, 
            <span>Frequency: ${content.frequency} </span>
          </div>`;
    });

    return tooltipContent;
  }

  transformedData(data) {
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
          observationData: [{ ...observationData, inDomainLine: true }],
          belongTo: null,
          expanded: false,
          hidden: false,
          isPinned: false,
        };

        const timeLine = {
          label: conceptName,
          id: conceptId,
          isPinned: false,
          hidden: false,
          expanded: false,
          observationData: [{ ...observationData }],
          belongTo: domain,
        };

        // push timeline for domain
        const timeLineDomainIndex = accumulator.findIndex(el => el.id === domain);
        if (timeLineDomainIndex > -1) {
          accumulator[timeLineDomainIndex].observationData.push({
            ...observationData,
            inDomainLine: true,
          });
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
}

export default Timeline;
