# Puck.js Modules and Examples

A set of pretty APIs for using Puck's features.

**Modules:**
* [:radio_button: Button](#radio_button-button)
* [:bulb: Lights](#bulb-lights-wip)
* [:wave: Proximity](#wave-proximity)
* [:arrows_counterclockwise: Scroll Wheel](#arrows_counterclockwise-scroll-wheel)

**Examples:**
* [:sound: Volume/Play/Pause](#sound-volumeplaypause)

## Modules

### :radio_button: Button
```javascript
Button.on("double", ()=>console.log("I got double clicked!"));
```

Emits events for button presses:
* `up`, `down` - for push and release
* `press` - single presses
* `long` - long press
* `double` - double press
* `multi` - multi-press sequence, passing an argument with the number of presses

### :bulb: Lights [WIP]
```javascript
Lights.pulsing().color(Lights.BLUE).when(Button, "down").until(Button, "up");
Lights.blip(Lights.CYAN, 500);
Lights.steady().rainbow().now().for(5000);
```

Simple API for controlling the LEDs.
(Currently WIP - started hitting performance limits of the board, so optimizations underway, but generally works.)

Built-in functions:
* Brightness:
  * `steady()`: constant 100% brightness
  * `pulsing(speed, lower_bound)`: sinusoidal pulsing effect, with a adjustable speed (default 1s per cycle) and lower bound (default 0%)
  * `blinking(speed, lower_bound)`: simple blinking (_high-low-high-low..._) effect, with a adjustable speed (default 1s per cycle) and lower bound (default 0%)
* Color:
  * `color(clr)`: single color, as an array of `[R, G, B]` as values from `<0,1>`, or constants defined on `Lights` (`BLACK`, `RED`, `GREEN`, `BLUE`, `CYAN`, `MAGENTA`, `YELLOW`)
  * `rainbow(speed)`: cycle through the color spectrum, with a adjustable speed (default 1s per cycle)
  * `pearly(axis,transition)`: (Experimental) Emulates a pearlescent effect by changing colors based on device rotation
* Start:
  * `now()`: start immediately
  * `after(ms)`: start after given number of milliseconds
  * `when(object,event)`: triggered by the given event (string) emitted by the given object
* End:
  * `for(ms)`: stop after given number of milliseconds
  * `until(object,event)`: stops when the given event (string) is emitted by the given object

### :wave: Proximity
```javascript
Prox.on("near", ()=>console.log("Light suddenly obstructed - some object most likely got close to me."));
Prox.on("far", ()=>console.log("Ahh, light back on - obstruction removed."));
```

Emulates a proximity sensor by using the light sensor. Continuously adapts to lighting conditions.
(Obvious caveat - doesn't work well in dimly lit environments).

Emits two events:
* `near` - when an object approaches
* `far` - when an object moves away

### :arrows_counterclockwise: Scroll Wheel
```javascript
Knob.on("plus", ()=>hid.volumeUp());
Knob.on("minus", ()=>hid.volumeDown());
Knob.start();
```

Emulates an incremental rotary encoder (scroll wheel) using magnetometer readings.
The number of notches per circle is configurable. Works horizontally and vertically (or in any other plane).

**Needs calibration** - during 4 seconds after calling `start()`, rotate the Puck 360 degrees in a single plane to make at least one full circle.
If Puck is moved after calibration, it will most likely need re-calibration (`stop();start()`).

Emits events when Puck is rotated:
* `plus` - clockwise
* `minus` - counterclockwise
* `notch` - both directions, passing an argument with the number of the current notch (for detecting absolute rotation - like compass).

Also emits an event when calibration finishes:
* `calibrated`

## Examples

### :sound: Volume/Play/Pause

Rotating the Puck like a knob changes volume, pressing the button issues a Play/Pause event. Works on Mac, Linux, Android.

Demonstrates four modules: Button, Lights, Proximity, Scroll Wheel. After uploading, rotation needs to be calibrated, see [Scroll Wheel](#arrows_counterclockwise-scroll-wheel).

The experimental `POWER_SAVE` switch, if enabled, stops the rotation detection (which consumes battery) if your hand is not near the Puck, and starts it up again when Puck is mostly covered by a hand. 
In power-save mode, consumption should be very low - only 2 light sensor readings per second as opposed to 10 magnetometer reading and processing cycles.
