<template>
  <div id="app" class="ma-0">
    <div class="card">
      <div id="timeline"></div>
    </div>
  </div>
</template>

<script>
import _ from 'lodash';
import * as d3 from 'd3';
import getTimeline from './timeline';
import myData from './components/data.json';

export default {
  name: 'app',
  mounted() {
    getTimeline('#timeline', myData.records, d3, _);
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
</style>
