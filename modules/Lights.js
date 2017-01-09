/* Copyright (c) 2016 Ron Smeral. See the file LICENSE for copying permission. */
/*
Control Puck's LEDs easily:
* color mode - RGB, HSB
* effects - strobe, pulse
* concurrent effects - blink a LED while pulsing
* blend modes - normal, additive
*
* Examples:
*  Lights.steady().pearly().when(Btn, "press").for(5000);
*  Lights.pulsing().color(Lights.BLUE).until(Knob, "calibrated");
*  Lights.blip(Lights.CYAN, 500);
*/

var BLEND_FUNCS = {
  add: function(a,b) {let m=i=>Math.min(a[i]+b[i],1);return [m(0),m(1),m(2)];}
};

var Util = {
  // workaround for missing Object.assign
  mrgObj: function(tgt,src){Object.keys(src).forEach(function(e){tgt[e]=src[e];});},
  blip: function(clr,dur){
    var dp = i=>digitalPulse(Lights.params.pins[i],1,dur*Math.min(0.99,clr[i]));
    dp(0);dp(1);dp(2);
  }
};

var Runner = (function(){
  var running = false;
  var until = [], when = [];
  var stack = [];
  var stackInterval;
  var blendFunc;
  var color = [0,0,0];

  var processStack = function() {
    Util.blip(color, 1000/Lights.params.freq);
    stack = stack.filter(function(p){ let r=p.isRunning(); if(!r&&p.onStop) p.onStop(p); return r; });
    if(stack.length)
      color = Lights.params.blend == "normal"? stack[stack.length-1].getColor() : stack.reduce(function(clr,prg){return blendFunc(clr,prg.getColor());}, Lights.BLACK);
    else Runner.stop();
  };

  var addLsnrFunc = function(lsnrArr) {
    return function(prg,obj,evt,lsn) {
      lsnrArr.push({prg: prg, obj: obj, evt: evt, lsn: lsn});
    };
  }

  var add = function(prg) {
    if(stack.indexOf(prg) == -1) {
      prg.startedAt = getTime();
      prg.terminated = false;
      
      if(prg.rgb)
        prg.getColor = function(){
          let c=this.rgb(this);
          let b=this.alpha(this);
          return [c[0]*b,c[1]*b,c[2]*b];
        }.bind(prg);
      else
        prg.getColor = function(){
          let c=E.HSBtoRGB(this.hue(this),1,this.alpha(this));
          return [(c&255)/255,((c&0xFF00)>>8)/255,(c>>16)/255];
        }.bind(prg);
      stack.push(prg);
      if(prg.onStart) prg.onStart(prg);
      start();
    }
  };

  var remove = function(prg) {
    [when, until].forEach(
      function(a){
        (function(b) {
          b.length && a.splice(a.indexOf(b[0]),1) && b[0].obj.removeListener(b[0].evt,b[0].lsn);
        })(a.filter(function(e) {return e.prg==prg;}));
      }
    );
  };

  var start = function() {
    if(!running) {
      blendFunc = BLEND_FUNCS[Lights.params.blend];
      stackInterval = setInterval(processStack, 1000/Lights.params.stackFreq);
      running = true;
    }
  };

  var stop = function() {
    if(running) {
      clearInterval(stackInterval);
      Lights.params.pins.forEach(function(p) {p.reset();});
      running = false;
    }
  };

  return {add: add, remove: remove, start: start, stop: stop, addWhen: addLsnrFunc(when), addUntil: addLsnrFunc(until)};
})();

/*  PROGRAM  */

// options: rgb, hue, alpha, ended
function Program(opts) {
  Util.mrgObj(this,opts||{});
  this.terminated = false;
}

Program.prototype = {
  // control
  isRunning: () => !this.terminated && !this.ended(this),

  stop: function() {this.terminated = true;},

  // chainable funcs to build programs
  color: function(clr) {
    this.rgb = function() {return clr;};
    return this;
  },

  for: function(dur) {
    this.ended = function(prog) {return getTime()>prog.startedAt+prog.duration;};
    this.duration = dur/1000;
    return this;
  },

  until: function(obj,evt) {
    this.ended = function() { return false; };
    var lsnr = this.stop.bind(this);
    obj.on(evt, lsnr);

    Runner.addUntil(this,obj,evt,lsnr);
    return this;
  },

  now: function() {
    Runner.add(this);
    return this;
  },

  after: function(pause) {
    setTimeout(Runner.add, pause, this);
    return this;
  },

  when: function(obj,evt) {
    var lsnr = (function() {
      Runner.add(this);
    }).bind(this);

    obj.on(evt, lsnr);
    Runner.addWhen(this,obj,evt,lsnr);
    return this;
  }
};

Program.prototype.constructor = Program;

var Lights = {
  BLACK: [0,0,0],
  RED: [1,0,0],
  GREEN: [0,1,0],
  BLUE: [0,0,1],
  CYAN: [0,1,1],
  MAGENTA: [1,0,1],
  YELLOW: [1,1,0],
  steady: (a) => new Program({a: (a||1), alpha: prg=>prg.a}),
  pulsing: (spd,lo) => new Program({spd: (spd||1), lo: (lo||0), alpha: prg => ((Math.sin(((getTime()-prg.startedAt)*prg.spd*2*Math.PI)-Math.PI/2)+1)/2/(1/(1-prg.lo))+prg.lo)}),
  blinking: (spd,lo) => new Program({spd: (spd||1), lo: (lo||0), alpha: prg => (((getTime()-prg.startedAt)*prg.spd)%1 > 0.5 ? 1 : prg.lo)}),
  blip: function(clr,dur) {Lights.steady().color(clr||Lights.params.color).for(dur||Lights.params.duration).now()},
  stop: Runner.stop,
  start: Runner.start,
  Program: Program,
  runner: Runner,
  Util: Util,
  params: {
    // blend mode: 'normal', 'add'
    blend: "normal",
    // PWM frequency (how fast the light blinks in order to produce shades of color)
    freq: 60,
    // array of pins in order [R, G, B]
    pins: [LED1, LED2, LED3],
    // default color
    color: [1,0,0],
    // default duration
    duration: 100
  }
}

exports = function(_params) {
  Util.mrgObj(Lights.params, _params);
  return Lights;
};
