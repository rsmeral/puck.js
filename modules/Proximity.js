/* Copyright (c) 2016 Ron Smeral. See the file LICENSE for copying permission. */
/*
* Emulates a proximity sensor by using the light sensor.
* (Obvious caveat - doesn't work well in dimly lit environments).
*
* Emits two events:
* 'near' - when an object approaches
* 'far' - when an object moves away
*/

var arr, avg, near, c, d, ivl;

var params = {
  // update frequency (Hz)
  // higher freq. increases responsiveness, but decreases reliability
  freq: 2,
  // average window size
  // smaller window increases responsiveness, but decreases reliability
  denoise: 3,
  // flip threshold as percentage  of average light (value in <0,1>)
  thresh: 0.8,
  // minimum number of milliseconds between flips
  debounce: 200
};

var Prox = {
  start: function(){
    arr = new Float32Array(params.denoise);
    avg = Puck.light();
    near = -1;
    c = d = 0;
    arr[c++] = avg;
    ivl = setInterval(prox, 1000/params.freq, params.thresh, params.denoise, params.debounce/1000,arr);
  },
  stop: function(){
    if(ivl) clearInterval(ivl);
    ivl = null;
  }
};

function prox(th,dn,db,ar) {
  let l = Puck.light();
  
  if((near*(l-avg*th) > 0) && getTime()-d > db) {
    near *= -1;
    Prox.emit(near>0?"near":"far");
    d=getTime();
  }
  if(near<0) {
    ar[c++%dn] = l;
    avg = E.sum(ar)/dn;
  }
}

exports = function(_params) {
  Object.keys(_params).forEach(e=>params[e]=_params[e]);
  return Prox;
};
