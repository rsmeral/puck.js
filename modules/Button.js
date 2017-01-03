/* Copyright (c) 2016 Ron Smeral. See the file LICENSE for copying permission. */
/*
Emits events for button presses:
* 'up', 'down' - for push and release
* 'press' - single presses
* 'long' - long press
* 'double' - double press
* 'multi' - multi-press sequence
*/

var params = {
  // long press threshold (seconds)
  longPressThresh: 0.6,
  // "double click speed" - maximum delay between presses of a multi-press sequence
  multiPressThresh: 0.3, // seconds
  // When false, multi-press events are only reported once after threshold passes after the last press of the sequence.
  // When true, multi-press events are reported after each down event of a multi sequence.
  immediate: false
};

var Button = {};

// workaround for missing Object.assign
var mergeObj = function(tgt, src){
  Object.keys(src).forEach(e=>tgt[e]=src[e]);
};

var pressedTime, releasedTime, longPressTimeout, shortPressTimeout, multi = 1;

function longPress() {
  longPressTimeout = null;
  Button.emit("long");
  multi = 1;
}

function multiPress() {
  Button.emit(["press","double","multi"][Math.min(multi,3)-1], multi);
}

function nonImmediateMultiPress() {
  shortPressTimeout = null;
  if (releasedTime > pressedTime) multiPress();
}

function handlePress() {
  Button.emit("down");
  if (getTime() - pressedTime < params.multiPressThresh) {
    multi += 1;
    if(!params.immediate && shortPressTimeout) clearTimeout(shortPressTimeout);
  } else multi = 1;
  pressedTime = getTime();
  if (params.immediate) multiPress();
  else shortPressTimeout = setTimeout(nonImmediateMultiPress, params.multiPressThresh * 1000);
  longPressTimeout = setTimeout(longPress, params.longPressThresh * 1000);
}

function handleRelease() {
  Button.emit("up");
  releasedTime = getTime();
  if (releasedTime - pressedTime < params.longPressThresh) {
    if(longPressTimeout) clearTimeout(longPressTimeout);
    if(!params.immediate && releasedTime - pressedTime > params.multiPressThresh) nonImmediateMultiPress();
  }
}

setWatch(handlePress, BTN, {repeat: true, edge: "rising", debounce: 50});
setWatch(handleRelease, BTN, {repeat: true, edge: "falling", debounce: 50});

exports = function(_params) {
  mergeObj(params, _params);
  return Button;
};
