/* Copyright (c) 2016 Ron Smeral. See the file LICENSE for copying permission. */
/*
Emulates an incremental rotary encoder (scroll wheel) using magnetometer readings.
The number of notches is configurable.

Emits events when Puck is rotated:
* 'plus' - clockwise
* 'minus' - counterclockwise
* 'notch' - both directions

Also emits an event when calibration finishes:
* 'calibrated'

Works horizontally and vertically (or in any other plane).
Needs calibration - rotate the Puck 360 degrees in a single plane.
*/

var params = {
  // number of steps per full circle
  notches: 10,
  // false - like clock: CW = plus,  CCW = minus
  // true -  like maths: CW = minus, CCW = plus
  inverse: false,
  // duration of calibration phase
  calibrationDuration: 4000,
  // magnetometer sample rate
  magSampleRate: 10,
  // smoothing
  avgWindowSize: 5
};

var ScrollWheel = {};

var notchSize, lastNotchAngle = 0, angle = 0, calibrated, calibTimeout, notchInterval, c=0;

var mergeObj = (tgt, src)=>Object.keys(src).forEach(function(e){tgt[e]=src[e]});
var sign = n=>n>0?1:-1;

// mag stats
var arr, min, max, val;

function initMagStats() {
  arr = {y:[],z:[]};
  min = {y:Infinity,z:Infinity};
  max = {y:-Infinity,z:-Infinity};
  val = {y:0,z:0};
}

function updateMagStats(mag) {
  ["y","z"].forEach(function(x) {
    arr[x][c%params.avgWindowSize] = mag[x];
    min[x] = Math.min(mag[x], min[x]);
    max[x] = Math.max(mag[x], max[x]);
    val[x] = ((E.sum(arr[x])/arr[x].length)-min[x])/(max[x]-min[x]);
  });
  c++;
  angle = Math.atan2(val.z-0.5, val.y-0.5);
}

function report(dir,angle) {
  lastNotchAngle = angle;
  ScrollWheel.emit(dir==(params.inverse?-1:1)?"plus":"minus");
  ScrollWheel.emit("notch", Math.floor(angle/(2*Math.PI/params.notches)));
}

var notchDetect = function() {
  let dif = Math.abs(angle-lastNotchAngle);
  let dir = sign(angle-lastNotchAngle);
  if(dif > Math.PI) {
    dif = Math.abs(dif-2*Math.PI);
    dir = -dir;
  }
  if(dif > notchSize) report(dir,angle);
}

function calibrationFinished() {
  calibTimeout = null;
  calibrated = true;
  lastNotchAngle = angle;
  notchInterval = setInterval(notchDetect, 1000/params.magSampleRate);
  ScrollWheel.emit("calibrated");
}

function start() {
  initMagStats();
  notchSize = 2*Math.PI/params.notches;
  calibrated = false;
  lastNotchAngle = 0;
  angle = 0;
  c = 0;
  calibTimeout = setTimeout(calibrationFinished, params.calibrationDuration);
  Puck.magOn(params.magSampleRate);
}

function resume() {
  Puck.magOn(params.magSampleRate);
  notchInterval = setInterval(notchDetect, 1000/params.magSampleRate);
}

function stop() {
  Puck.magOff();
  if(calibTimeout) clearTimeout(calibTimeout);
  if(notchInterval) clearInterval(notchInterval);
  notchInterval = null;
}

ScrollWheel.start = start;
ScrollWheel.stop = stop;
ScrollWheel.resume = resume;

Puck.on("mag", updateMagStats);

exports = function(_params) {
  mergeObj(params, _params);
  return ScrollWheel;
};
