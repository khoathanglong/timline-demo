<template>
  <div id="app">
    <TimeLine />
  </div>
</template>

<script>
import TimeLine from '@/components/Timeline.vue';

export default {
  name: 'app',
  components: {
    TimeLine,
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
