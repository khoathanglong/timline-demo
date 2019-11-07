<template>
  <div id="app" class="ma-0">
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
    getTimeline('#app', myData.records, d3, _);
  },
};
</script>

<style lang="less">
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
