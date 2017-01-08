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

var notchSize, lastNotchAngle, angle, calibrated, calibTimeout, c;
// mag stats
var arr, min, max, val;

var params = {
  // number of steps per full circle
  notches: 10,
  // false - like clock: CW = plus,  CCW = minus
  // true -  like maths: CW = minus, CCW = plus
  inverse: false,
  // duration of calibration phase
  calibrationDuration: 4000,
  // magnetometer sample rate
  magSampleRate: 5,
  // smoothing
  avgWindowSize: 3
};

var ScrollWheel = {
  start: function() {
    arr = {y:[],z:[]};
    min = {y:Infinity,z:Infinity};
    max = {y:-Infinity,z:-Infinity};
    val = {y:0,z:0};
    
    notchSize = 2*Math.PI/params.notches;
    lastNotchAngle = angle = c = 0;
    calibrated = false;
    calibTimeout = setTimeout(calibrationFinished, params.calibrationDuration);
    Puck.magOn(params.magSampleRate);
  },

  resume: function() {
    Puck.magOn(params.magSampleRate);
  },

  stop: function() {
    Puck.magOff();
    if(calibTimeout) clearTimeout(calibTimeout);
  }
};

function calibrationFinished() {
  calibTimeout = null;
  calibrated = true;
  lastNotchAngle = angle;
  ScrollWheel.emit("calibrated");
}

function notchDetect(m) {
  // detect angle
  if(!calibrated) {
    min.y = Math.min(m.y, min.y);
    min.z = Math.min(m.z, min.z);
    max.y = Math.max(m.y, max.y);
    max.z = Math.max(m.z, max.z);
    return;
  }
  arr.y[c%params.avgWindowSize] = m.y;
  arr.z[c++%params.avgWindowSize] = m.z;
  val.y = ((E.sum(arr.y)/params.avgWindowSize)-min.y)/(max.y-min.y);
  val.z = ((E.sum(arr.z)/params.avgWindowSize)-min.z)/(max.z-min.z);

  angle = Math.atan2(val.z-0.5, val.y-0.5);
  
  // detect notch
  let dif = Math.abs(angle-lastNotchAngle);
  let dir = angle>lastNotchAngle;
  if(dif > Math.PI) {
    dif = Math.abs(dif-2*Math.PI);
    dir = !dir;
  }
  
  // report
  if(dif > notchSize) {
    lastNotchAngle = angle;
    ScrollWheel.emit(dir!=params.inverse?"plus":"minus");
    ScrollWheel.emit("notch", Math.floor(angle/(2*Math.PI/params.notches)));
  }
}

Puck.on("mag", notchDetect);

exports = function(_params) {
  Object.keys(_params).forEach(function(e){params[e]=_params[e]});
  return ScrollWheel;
};
