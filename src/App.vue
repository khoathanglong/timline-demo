<template>
  <div id="app" class="ma-0">
    <div class="card">
      <div id="timeline"></div>
    </div>
  </div>
</template>

<script>
/* eslint-disable no-unused-vars */

import getTimeline from './timeline';
import myData from './components/data.json';

export default {
  name: 'app',
  mounted() {
    // eslint-disable-next-line new-cap
    const timeline = new getTimeline('timeline');
    timeline.updateData(myData.records);
  },
};
</script>

<style>
@import url('https://fonts.googleapis.com/css?family=Open+Sans&display=swap');
#app {
  font-family: 'Open Sans', sans-serif ;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
.card {
  box-shadow: 0 4px 8px 0 rgba(0,0,0,0.2);
  transition: 0.3s;
  margin: auto 20px;
}
div.tooltip {
  position: absolute;
  text-align: left;
  width: auto;
  height: auto;
  padding: 4px;
  font-size: 12px;
  background: black;
  border: 0px;
  border-radius: 8px;
  pointer-events: none;
  color: white;
}
.fa{
  font-family: 'FontAwesome' !important;
}

.timelineFilter {
  display: flex;
 justify-content: space-between;
}

.hidden-axis {
  visibility: hidden;
}
    .tooltip {
      position: absolute !important;
      text-align: left;
      width: auto;
      height: auto;
      padding: 4px;
      font-size: 12px;
      background: black;
      border: 0px;
      border-radius: 8px;
      pointer-events: none;
      color: white;
    }

    .colorPicker {
      position: absolute !important;
    }

    .labelContainers {
      cursor: pointer;
    }

    .label {
      font-weight: normal !important;
      font-family: Verdana, Arial, sans-serif;
    }

    .timelineFilter {
      display: flex;
      justify-content: space-between;
    }
    .timelineFilter:first-child {
      text-align: left;
    }

    .hidden-axis {
      visibility: hidden;
    }

    .switch {
      position: relative;
      display: inline-block;
      width: 40px;
      height: 20px;
    }

    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #ccc;
      -webkit-transition: 0.4s;
      transition: 0.4s;
    }

    .slider:before {
      position: absolute;
      content: '';
      height: 12px;
      width: 12px;
      left: 4px;
      bottom: 4px;
      background-color: white;
      -webkit-transition: 0.4s;
      transition: 0.4s;
    }

    input:checked + .slider {
      background-color: #2196f3;
    }

    input:focus + .slider {
      box-shadow: 0 0 1px #2196f3;
    }

    input:checked + .slider:before {
      -webkit-transform: translateX(20px);
      -ms-transform: translateX(20px);
      transform: translateX(20px);
    }

    /* Rounded sliders */
    .slider.round {
      border-radius: 34px;
    }

    .slider.round:before {
      border-radius: 50%;
    }
</style>
