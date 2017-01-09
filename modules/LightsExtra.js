exports = function(l) {
  l.Program.prototype.rainbow = function(spd) {
    this.rspd = (spd||1);
    this.hue = function(prog) {
      return ((getTime()-prog.startedAt)*prog.rspd)%1;
    }
    return this;
  };
  l.Program.prototype.pearly = function(axis,transition) {
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
      prg.prl.steps = l.params.freq*prg.prl.transition;
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
  };
  return l;
};