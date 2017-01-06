/* Copyright (c) 2016 Ron Smeral. See the file LICENSE for copying permission. */
/*
* Emulates a proximity sensor by using the light sensor.
* (Obvious caveat - doesn't work well in dimly lit environments).
*
* Emits two events:
* 'near' - when an object approaches
* 'far' - when an object moves away
*/

var AVG_WND = 10;
var FLIP_FACTOR = 2;

var lightArr, lightDif, lightAvg, near, c, ivl;

var params = {
  // update frequency (Hz)
  freq: 2
};

var Proximity = {};

var mergeObj = function(tgt, src){Object.keys(src).forEach(e=>tgt[e]=src[e])};

function updateLightStats(l) {
  lightArr[c++%AVG_WND] = l;
  let lightMin = lightArr.reduce((min, v) => Math.min(min, v), 1);
  let lightMax = lightArr.reduce((max, v) => Math.max(max, v), 0);
  lightDif = lightMax-lightMin;
  lightAvg = E.sum(lightArr) / lightArr.length;
}

function proximity() {
  let l = Puck.light();
  if(!near) {
    if(lightAvg - l > FLIP_FACTOR * lightDif) {
      near = true;
      Proximity.emit("near");
    } else updateLightStats(l);
  } else {
    if(lightAvg - l < FLIP_FACTOR * lightDif) {
      near = false;
      Proximity.emit("far");
    }
  }
}

function start() {
  lightArr = [0.5];
  lightDif = 0;
  lightAvg = 0;
  near = false;
  c = 1;
  ivl = setInterval(proximity, 1000/params.freq);
}

function stop() {
  if(ivl) clearInterval(ivl);
  ivl = null;
}

Proximity.start = start;
Proximity.stop = stop;

exports = function(_params) {
  mergeObj(params, _params);
  return Proximity;
};
