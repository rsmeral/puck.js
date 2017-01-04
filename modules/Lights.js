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
  normal: function(c1,c2) { return c2; },
  add: function(c1,c2) {
    return c1.map(function(v,i) { return Math.min(c1[i]+c2[i],1);});
  }
};

var Util = {
  // workaround for missing Object.assign
  mrgObj: function(tgt,src){Object.keys(src).forEach(function(e){tgt[e]=src[e];});},
  blip: function(clr,dur){

    params.pins.forEach(
      function(v,i){
        if(clr[i]==1) {
          v.set();
        } else if (clr[i]==0) {
          v.reset();
        } else {
          digitalPulse(v,1,dur*Math.min(0.99,clr[i]));
        }
      }
    );
  },
  blend: function(c1,c2,op) {
    return op(c1,c2);
  }
};

var bsum = 0;//TODO remove (with mentions)
var bcnt = 0;
var bstart = 0;

var Runner = (function(){
  var running = false;
  var until = [], when = [];
  var stack = [];
  var stackInterval;
  var blipInterval;
  var blendFunc;
  var color = [0,0,0];

  var processStack = function() {

    stack = stack.filter(function(p){ let r=p.isRunning(); if(!r&&p.onStop) p.onStop(p); return r; });
    if(stack.length) {
      color = params.blend == "normal"? stack[stack.length-1].getColor() : stack.reduce(function(clr,prg){return blendFunc(clr,prg.getColor());}, Lights.BLACK);
    } else {
      Runner.stop();
    }

  };

  var doBlip = function() {
    Util.blip(color, 1000/params.freq);
    bcnt++;
  }

  var addLsnrFunc = function(lsnrArr) {
    return function(prg,obj,evt,lsn) {
      lsnrArr.push({prg: prg, obj: obj, evt: evt, lsn: lsn});
    };
  }

  var add = function(prg) {
    if(stack.indexOf(prg) == -1) {
      prg.startedAt = getTime()*1000;
      prg.terminated = false;
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
      blendFunc = BLEND_FUNCS[params.blend];
      stackInterval = setInterval(processStack, 1000/params.stackFreq);
      blipInterval = setInterval(doBlip, 1000/params.freq);
      running = true;
    }
    bstart = getTime();
  };

  var stop = function() {
    if(running) {
      clearInterval(stackInterval);
      clearInterval(blipInterval);
      params.pins.forEach(function(p) {p.reset();});
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
  // internal
  getColor: function() {
    return (this.rgb)?
      this.rgb(this).map(function(v) {return v*this.alpha(this);}, this):
      (function(c){return [(c&255)/255,((c&0xFF00)>>8)/255,(c>>16)/255];})(E.HSBtoRGB(this.hue(this),1,this.alpha(this)));
  },

  // control
  isRunning: () => !this.terminated && !this.ended(this),

  stop: function() {this.terminated = true;},

  // chainable funcs to build programs
  color: function(clr) {
    this.rgb = function() {return clr;};
    return this;
  },

  rainbow: function(spd) {
    this.hue = function(prog) {
      return ((getTime()-(prog.startedAt/1000))*spd)%1;
    }
    return this;
  },
  //
  // rgb: function(f) {
  //   this.rgb = f;
  //   return this;
  // },

  // hue: function(f) {
  //   this.hue = f;
  //   return this;
  // },

  pearly: function(axis,transition) {
    this.onStart = function(prg) {
      prg.prl = {
        freq: 10,
        transition: transition||0.2,
        axis: axis||"z",
        min: 9999,
        max: -9999,
        tgt: 0,
        cur: 0
      };
      prg.prl.steps = params.freq*prg.prl.transition;
      Puck.magOn(prg.prl.freq);
      prg.prl.maglsnr = function(e) {
        let p = prg.prl;
        p.max = Math.max(e[p.axis], p.max);
        p.min = Math.min(e[p.axis], p.min);
        if(p.max != p.min) {
          p.tgt = (e[p.axis]-p.min)/(p.max-p.min);
        }
      }
      Puck.on("mag", prg.prl.maglsnr);
    };

    this.onStop = function(prg) {
      Puck.magOff();
      Puck.removeListener("mag", prg.prl.maglsnr);
    }

    this.hue = function(prg) {
      prg.prl.cur += (prg.prl.tgt-prg.prl.cur)/(prg.prl.steps);
      return prg.prl.cur;
    };
    return this;
  },

  for: function(dur) {
    this.ended = function(prog) {return getTime()*1000>prog.startedAt+prog.duration;};
    this.duration = dur;
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
  program: opts => new Program(opts),
  steady: (a) => new Program({alpha: ()=>(a||1)}),
  pulsing: (spd,lo) => new Program({alpha: prg => ((Math.sin(((getTime()-prg.startedAt)*(spd||1)*2*Math.PI)-Math.PI/2)+1)/2/(1/(1-(lo||0)))+(lo||0))}),
  blinking: (spd,lo) => new Program({alpha: prg => (((getTime()-prg.startedAt)*(spd||1))%1 > 0.5 ? 1 : (lo||0))}),
  stop: Runner.stop,
  start: Runner.start,
  Program: Program,
  runner: Runner,
  Util: Util,
  bavg: function() {
    let r = (bsum/bcnt)*1000;
    bsum = 0;
    bcnt = 0;
    return r;
  },
  bfps: function() {
    let r = bcnt/(getTime()-bstart);
    bcnt = 0;
    bstart = getTime();
    return r;
  }
}

Lights.blip = function(clr,dur) {Lights.steady().color(clr||params.color).for(dur||params.duration).now()};

var params = {
  // blend mode: 'normal', 'add'
  blend: "normal",
  // PWM frequency (how fast the light blinks in order to produce shades of color)
  freq: 50,
  stackFreq: 50,
  // array of pins in order [R, G, B]
  pins: [LED1, LED2, LED3],
  // default color
  color: Lights.RED,
  // default duration
  duration: 100
};

exports = function(_params) {
  Util.mrgObj(params, _params);
  return Lights;
};
