var Lux = require("https://raw.githubusercontent.com/rsmeral/puck.js/master/modules/Lights.js")();
var Btn = require("https://raw.githubusercontent.com/rsmeral/puck.js/master/modules/Button.js")();
var Knob = require("https://raw.githubusercontent.com/rsmeral/puck.js/master/modules/ScrollWheel.js")();
var Prox = require("https://raw.githubusercontent.com/rsmeral/puck.js/master/modules/Proximity.js")();
var Hid = require("ble_hid_controls");

var POWER_SAVE = false;

Lux.steady().color(Lux.RED).when(Knob, "plus").for(30);
Lux.steady().color(Lux.GREEN).when(Knob, "minus").for(30);
Lux.steady().color(Lux.BLUE).until(Knob, "calibrated").now();

Btn.on("press", Hid.playpause);
Knob.on("plus", Hid.volumeUp);
Knob.on("minus", Hid.volumeDown);

if(POWER_SAVE) {
  Knob.on("calibrated", ()=>{Prox.start(); Knob.stop();});
  Prox.on("near", Knob.resume);
  Prox.on("far", Knob.stop);
}

Knob.start();
NRF.setServices(undefined, { hid : Hid.report });
console.log("up");
