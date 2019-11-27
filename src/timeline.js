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
import moment from 'moment';

class Timeline {
  svg;

  brush;

  brushed;

  xDayScale;

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

  height =1000

  lineStroke = '#CDCDCD';

  circleFill = '#CDCDCD';

  pinFill = '#467AB2';

  expandAllColor = '#467AB2';

  textFill = 'black';

  pinnedFill = 'blue';

  pinnedIcon;

  constructor(htmlElement, rawData, d3) {
    this.htmlElement = htmlElement;
    this.d3 = d3;
    this.filteredData = [];
    this.filterText = '';
    this.axisType = '';
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

    this.maxDate = d3.max(
      this.allData
        .map(el => el.observationData)
        .flat()
        .map(el => el.endDate),
    );

    this.minDate = d3.min(
      this.allData
        .map(el => el.observationData)
        .flat()
        .map(el => el.startDate),
    );
    this.implementColorScheme();
    this.implementFilter();
    this.implementAxisSelection();
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

  implementAxisSelection() {
    const container = this.d3
      .select('.timelineFilter')
      .append('div')
      .style('text-align', 'right')
      .style('margin-right', `${this.margin.right / 2}px`);

    container
      .append('text')
      .text('axis type: ');

    const selection = container
      .append('select')
      .on('change', () => this.changeAxisView());

    const options = ['Day', 'Date'];
    selection.selectAll('option')
      .data(options)
      .enter()
      .append('option')
      .text(d => d);
  }

  changeAxisView() {
    const selected = this.d3.select('select').property('value');
    this.axisType = selected;
    this.svg.select('.dayAxis').classed('hidden-axis', selected !== 'Day');
    this.svg.select('.dateAxis').classed('hidden-axis', selected !== 'Date');
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
        .filter(
          el => !el.belongTo
            || el.isPinned
            || (el.belongTo && el.label.toLowerCase().includes(this.filterText.toLowerCase())),
        )
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
    for (let i = 0; i < this.originalData.length; i += 1) {
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
        .filter(
          el => el.isPinned
            || (el.belongTo && el.label.toLowerCase().includes(this.filterText.toLowerCase())),
        );
    } else {
      expandedData = this.allData.filter(el => el.belongTo === domain.label);
    }
    const domainIndex = this.originalData.findIndex(el => el.label === domain.label);
    this.originalData[domainIndex].expanded = true;
    // calculate length of current expanding concepts
    const domainConceptsLength = this.originalData.filter(el => el.belongTo === domain.label)
      .length;
    this.originalData.splice(domainIndex + 1, domainConceptsLength, ...expandedData);
    this.drawTimeline(this.originalData);
  }

  closeDomain(domain) {
    const domainIndex = this.originalData.findIndex(el => el.label === domain.label);
    this.originalData[domainIndex].expanded = false;
    const closingLength = this.originalData.filter(el => el.belongTo === domain.label).length;
    const existingElement = this.originalData.filter(
      el => el.belongTo === domain.label && el.isPinned,
    );
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
    // create day xAxis
    this.svg.append('g').attr('class', 'dayAxis');
    // create date xAxis
    this.svg.append('g').attr('class', 'dateAxis hidden-axis');

    // dayAxis Scale
    this.xDayScale = this.d3
      .scaleLinear()
      .domain([this.minMoment, this.maxMoment])
      .range([0, this.width]);
    // dateAxis Scale
    this.xDateScale = this.d3
      .scaleTime()
      .domain([this.minDate, this.maxDate])
      .range([0, this.width]);

    this.svg.select('.dayAxis').call(this.d3.axisBottom(this.xDayScale));
    this.svg.select('.dateAxis').call(this.d3.axisBottom(this.xDateScale));
    // create brush
    this.brush = this.svg.append('g').attr('class', 'brush');

    this.drawTimeline(this.originalData);
  }

  resetBrush() {
    this.svg.select('.brush').call(this.brushed.move, null);
    this.xDayScale.domain([this.minMoment, this.maxMoment]);
    this.xDateScale.domain([this.minDate, this.maxDate]);


    this.svg.select('.dayAxis').call(this.d3.axisBottom(this.xDayScale));
    this.svg.select('.dateAxis').call(this.d3.axisBottom(this.xDateScale));
    // update circles
    this.svg.selectAll('circle').attr('cx', d => this.xDayScale(d.startMoment));

    // update lines
    this.svg
      .selectAll('.observationLine')
      .attr('x1', d => this.xDayScale(d.startMoment))
      .attr('x2', d => this.xDayScale(d.endMoment));
  }

  makeBrush() {
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
        [this.width, this.height],
      ])
      .on('end', () => {
        const extent = this.d3.event.selection;
        if (!extent) {
          if (!idleTimeout) {
            // This allows to wait a little bit
            idleTimeout = setTimeout(idled, 350);
            return;
          }
          this.xDayScale.domain([this.minMoment, this.maxMoment]);
          this.xDateScale.domain([this.minDate, this.maxDate]);
        } else {
          const extentDay0 = this.xDayScale.invert(extent[0]);
          const extentDay1 = this.xDayScale.invert(extent[1]);

          const extentDate0 = this.xDateScale.invert(extent[0]);
          const extentDate1 = this.xDateScale.invert(extent[1]);

          this.xDayScale.domain([extentDay0, extentDay1]);
          this.xDateScale.domain([extentDate0, extentDate1]);
          this.svg.select('.brush').call(this.brushed.move, null);
        }
        // update axis
        this.svg.select('.dayAxis').call(this.d3.axisBottom(this.xDayScale));
        this.svg.select('.dateAxis').call(this.d3.axisBottom(this.xDateScale));
        // update circles
        this.svg.selectAll('circle').attr('cx', d => this.xDayScale(d.startMoment));

        // update lines
        this.svg
          .selectAll('.observationLine')
          .attr('x1', d => this.xDayScale(d.startMoment))
          .attr('x2', d => this.xDayScale(d.endMoment));
      });

    this.brush.call(this.brushed);
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
    this.height = chartData.length * this.ySpace;

    // re-assign height and width
    this.d3
      .select('svg')
      .attr('width', this.width + this.margin.left + this.margin.right)
      .attr('height', this.height + this.margin.top + this.margin.bottom);

    // (re)calculate axis

    this.svg.select('.dayAxis').attr('transform', `translate(0,${this.height})`);
    this.svg.select('.dateAxis').attr('transform', `translate(0,${this.height})`);

    // (re)calculate clip path
    this.svg
      .select('#clip rect')
      .attr('width', this.width)
      .attr('height', this.height);


    this.makeBrush();


    let timelineParent = this.svg
      .selectAll('.timelineParent')
      .data(chartData, d => (d.belongTo ? d.label + d.belongTo + d.isPinned : d.label + d.expanded));

    // remove a timeline
    // if not remove timelineChildren, they are still in memory even after being deleted
    timelineParent.exit().select('.labelContainers').remove();

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


    const labelContainers = timelineParentEnter.append('g').attr('class', 'labelContainers');
    // append timelineChildren to newly added timelinesParent
    timelineParentEnter.append('g').attr('class', 'timelineChildren');

    labelContainers
      .attr('transform', (d, i) => `translate(${d.belongTo
        ? -this.margin.left + this.truncateLength + 20
        : -this.margin.left + this.truncateLength},${this.fontSize})`)
      .on('click', (d, i) => {
        if (d.belongTo) {
          this.pinLabel({ ...d, isPinned: !d.isPinned });
        } else if (!d.belongTo && !d.expanded) {
          this.expandDomain(d);
        } else if (!d.belongTo && d.expanded) {
          this.closeDomain(d);
        }
      });

    labelContainers.append('text')
      .attr('class', 'fa icon')
      .attr('font-size', d => (!d.belongTo ? this.domainFontSize : this.fontSize))
      .attr('transform', function (d) {
        // if (!d.belongTo) return 'none';
        const me = labelContainers.node();
        const x1 = me.getBBox().x + me.getBBox().width / 2;// the center x about which you want to rotate
        const y1 = me.getBBox().y + me.getBBox().height / 2;// the center y about which you want to rotate
        return `rotate(45, ${x1}, ${y1})`;// rotate 180 degrees about x and y
      })
      .attr('x', -5);

    labelContainers
      .append('text')
      .attr('class', 'fa label')
      .attr('font-size', d => (!d.belongTo ? this.domainFontSize : this.fontSize))
      .attr('fill', d => (d.isPinned ? this.pinnedFill : this.textFill))
      .style('text-anchor', 'start')
      .attr('x', 10);


    // merge back to the timelineParent
    timelineParent = timelineParentEnter.merge(timelineParent);
    // update other timeline
    timelineParent.attr('transform', (d, i) => `translate(${0},${i * this.ySpace})`);


    timelineParent
      .select('g.labelContainers')
      .select('text.label')
      .text((d) => {
        const label = _.truncate(d.label, { length: this.truncateLength });
        if (d.belongTo) {
          return label;
        }
        return d.expanded ? `${label} \uf106` : `${label} \uf107`;
      })
      .attr('fill', d => (d.isPinned ? this.pinFill : this.textFill));

    timelineParent
      .select('g.labelContainers')
      .select('text.icon')
      .text((d) => {
        if (d.label === 'drug') {
          return '';
        }
        return (d.belongTo ? '\uf08d' : '');
      })
      .attr('fill', d => (d.isPinned ? this.pinFill : this.textFill));


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
      .attr('x1', d => this.xDayScale(d.startMoment))
      .attr('x2', d => this.xDayScale(d.endMoment))
      .attr('stroke', d => (d.inDomainLine ? this.lineStroke : this.colorScheme(d.conceptId)))
      .attr('stroke-width', this.lineStrokeWidth);

    // cicles
    const circles = timelineChildren.selectAll('circle').data(d => d.observationData);

    circles
      .enter()
      .append('circle')
      .attr('cx', d => this.xDayScale(d.startMoment))
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
    const allDataIndex = this.allData.findIndex(el => el.id === d.id && el.belongTo === d.belongTo);
    this.allData[allDataIndex].isPinned = d.isPinned;
    this.originalData[originalDataIndex].isPinned = d.isPinned;
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
      const startTime = this.axisType === 'Date' ? moment(content.startDate).format('MM-DD-YYYY') : content.startMoment;
      const endTime = this.axisType === 'Date' ? moment(content.endDate).format('MM-DD-YYYY') : content.endMoment;
      const startEndDifferent = content.startMoment !== content.endMoment;
      tooltipContent += `<div style="margin-bottom:5px">
            <strong>${content.conceptId}</strong> <br />
            <span>Start: ${startTime} ${
  startEndDifferent ? `- End: ${endTime}` : ''
}
          </span>, 
            <span>Frequency: ${content.frequency} </span>
          </div>`;
    });

    return tooltipContent;
  }

  transformedData(data) {
    // const format = this.d3.timeFormat('%m/%d/%Y');
    const tData = _.transform(
      data,
      // eslint-disable-next-line no-unused-vars
      (accumulator, item, index, originalArr) => {
        const { conceptId, conceptName, domain } = item;
        const { endDay, startDay } = item;
        const startDate = item.startDate || new Date(moment(new Date()).add(startDay, 'days'));
        const endDate = item.startDate || new Date(moment(new Date()).add(endDay, 'days'));
        const observationData = {
          startMoment: this.axisType === 'Date' ? startDate : startDay,
          endMoment: this.axisType === 'Date' ? endDate : endDay,
          endDay,
          startDay,
          endDate,
          startDate,
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
