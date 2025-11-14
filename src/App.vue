<template>
  <div id="app">
    <h1>人脸检测 Demo</h1>
    <FaceDetector />
  </div>
</template>

<script setup>
import FaceDetector from './components/FaceDetector.vue'
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 20px;
}

h1 {
  color: #42b983;
}
</style>
