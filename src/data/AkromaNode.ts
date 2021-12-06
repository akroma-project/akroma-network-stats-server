import { Block, Stats, Uptime } from "../model";
import _ from "lodash";
import geoip, { Lookup } from "geoip-lite";

class AkromaNode {
  MAX_HISTORY = 40;
  MAX_INACTIVE_TIME = 1000 * 60 * 60 * 4;

  id: string = ''; //name of node
  trusted: boolean = false;
  info: any = {}; // TODO: type info
  geo: Lookup | null = null;
  stats: Stats = new Stats();
  history: number[] = new Array(this.MAX_HISTORY);
  uptime: Uptime = new Uptime();
  spark: any = {}; // TODO: type spark

  // TODO: type data
  constructor(data: any) {
    // this.id = null;
    // this.trusted = false;
    // this.info = {};
    // this.geo = {};
    // this.stats = {
    //   active: false,
    //   mining: false,
    //   hashrate: 0,
    //   peers: 0,
    //   pending: 0,
    //   gasPrice: 0,
    //   block: {
    //     number: 0,
    //     hash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    //     difficulty: 0,
    //     totalDifficulty: 0,
    //     gasLimit: 0,
    //     timestamp: 0,
    //     time: 0,
    //     arrival: 0,
    //     received: 0,
    //     propagation: 0,
    //     transactions: [],
    //     uncles: [],
    //   },
    //   syncing: false,
    //   propagationAvg: 0,
    //   latency: 0,
    //   uptime: 100,
    // };

    // this.history = new Array(this.MAX_HISTORY);

    // this.uptime = {
    //   started: null,
    //   up: 0,
    //   down: 0,
    //   lastStatus: null,
    //   lastUpdate: null,
    // };

    _.fill(this.history, -1);

    if (this.id === null && this.uptime.started === null) {
      this.setState(true);
    }

    this.id = _.result(data, "id", this.id);

    if (!_.isUndefined(data.latency)) {
      this.stats.latency = data.latency;
    }

    this.setInfo(data, null);
  }

  setInfo(data: any, callback: Function | null) {
    if (!_.isUndefined(data.info)) {
      this.info = data.info;

      if (!_.isUndefined(data.info.canUpdateHistory)) {
        this.info.canUpdateHistory = _.result(data, "info.canUpdateHistory", false);
      }
    }

    if (!_.isUndefined(data.ip)) {
      // TODO: WHERE DOES TRUSTED COME UP?
      // if( trusted.indexOf(data.ip) >= 0 || process.env.LITE === 'true')
      // {
      // 	this.trusted = true;
      // }

      this.setGeo(data.ip);
    }

    // TODO: type spark
    this.spark = _.result(data, "spark", null);

    this.setState(true);

    if (callback !== null) {
      callback(null, this.getInfo());
    }
  }

  setGeo(ip: string) {
    this.info.ip = ip;
    this.geo = geoip.lookup(ip);
  }

  getInfo() {
    return {
      id: this.id,
      info: this.info,
      stats: {
        active: this.stats.active,
        mining: this.stats.mining,
        syncing: this.stats.syncing,
        hashrate: this.stats.hashrate,
        peers: this.stats.peers,
        gasPrice: this.stats.gasPrice,
        block: this.stats.block,
        propagationAvg: this.stats.propagationAvg,
        uptime: this.stats.uptime,
        latency: this.stats.latency,
        pending: this.stats.pending,
      },
      history: this.history,
      geo: this.geo,
    };
  }

  setStats(stats: any, history: number[], callback: Function) {
    if (!_.isUndefined(stats)) {
      this.setBlock(_.result(stats, "block", this.stats.block), history, function (_err: any, _block: any) {});

      this.setBasicStats(stats, function (_err: any, _stats: any) {});

      this.setPending(_.result(stats, "pending", this.stats.pending), function (_err: any, _stats: any) {});

      callback(null, this.getStats());
    }

    callback("Stats undefined", null);
  }

  setBlock(block: Block, history: number[], callback: Function) {
    if (!_.isUndefined(block) && !_.isUndefined(block.number)) {
      if (!_.isEqual(history, this.history) || !_.isEqual(block, this.stats.block)) {
        if (block.number !== this.stats.block.number || block.hash !== this.stats.block.hash) {
          this.stats.block = block;
        }

        this.setHistory(history);

        callback(null, this.getBlockStats());
      } else {
        callback(null, null);
      }
    } else {
      callback("Block undefined", null);
    }
  }

  setHistory(history: number[]) {
    if (_.isEqual(history, this.history)) {
      return false;
    }

    if (!_.isArray(history)) {
      this.history = _.fill(new Array(this.MAX_HISTORY), -1);
      this.stats.propagationAvg = 0;

      return true;
    }

    this.history = history;

    var positives = _.filter(history, function (p) {
      return p >= 0;
    });

    this.stats.propagationAvg = positives.length > 0 ? Math.round(_.sum(positives) / positives.length) : 0;
    return true;
  }

  setPending(stats: any, callback: Function) {
    if (!_.isUndefined(stats) && !_.isUndefined(stats.pending)) {
      if (!_.isEqual(stats.pending, this.stats.pending)) {
        this.stats.pending = stats.pending;

        callback(null, {
          id: this.id,
          pending: this.stats.pending,
        });
      } else {
        callback(null, null);
      }
    } else {
      callback("Stats undefined", null);
    }
  }

  setBasicStats(stats: any, callback: Function) {
    if (!_.isUndefined(stats)) {
      if (
        !_.isEqual(stats, {
          active: this.stats.active,
          mining: this.stats.mining,
          hashrate: this.stats.hashrate,
          peers: this.stats.peers,
          gasPrice: this.stats.gasPrice,
          uptime: this.stats.uptime,
        })
      ) {
        this.stats.active = stats.active;
        this.stats.mining = stats.mining;
        this.stats.syncing = !_.isUndefined(stats.syncing) ? stats.syncing : false;
        this.stats.hashrate = stats.hashrate;
        this.stats.peers = stats.peers;
        this.stats.gasPrice = stats.gasPrice;
        this.stats.uptime = stats.uptime;

        callback(null, this.getBasicStats());
      } else {
        callback(null, null);
      }
    } else {
      callback("Stats undefined", null);
    }
  }

  setLatency(latency: number, callback: Function) {
    if (!_.isUndefined(latency)) {
      if (!_.isEqual(latency, this.stats.latency)) {
        this.stats.latency = latency;

        callback(null, {
          id: this.id,
          latency: latency,
        });
      } else {
        callback(null, null);
      }
    } else {
      callback("Latency undefined", null);
    }
  }

  getStats() {
    return {
      id: this.id,
      stats: {
        active: this.stats.active,
        mining: this.stats.mining,
        syncing: this.stats.syncing,
        hashrate: this.stats.hashrate,
        peers: this.stats.peers,
        gasPrice: this.stats.gasPrice,
        block: this.stats.block,
        propagationAvg: this.stats.propagationAvg,
        uptime: this.stats.uptime,
        pending: this.stats.pending,
        latency: this.stats.latency,
      },
      history: this.history,
    };
  }

  getBlockStats() {
    return {
      id: this.id,
      block: this.stats.block,
      propagationAvg: this.stats.propagationAvg,
      history: this.history,
    };
  }

  getBasicStats() {
    return {
      id: this.id,
      stats: {
        active: this.stats.active,
        mining: this.stats.mining,
        syncing: this.stats.syncing,
        hashrate: this.stats.hashrate,
        peers: this.stats.peers,
        gasPrice: this.stats.gasPrice,
        uptime: this.stats.uptime,
        latency: this.stats.latency,
      },
    };
  }

  setState(active: any) {
    var now = _.now();

    if (this.uptime.started !== null) {
      if (this.uptime.lastStatus === active) {
        this.uptime[active ? "up" : "down"] += now - this.uptime.lastUpdate;
      } else {
        this.uptime[active ? "down" : "up"] += now - this.uptime.lastUpdate;
      }
    } else {
      this.uptime.started = now;
    }

    this.stats.active = active;
    this.uptime.lastStatus = active;
    this.uptime.lastUpdate = now;

    this.stats.uptime = this.calculateUptime();
  }

  calculateUptime() {
    if (this.uptime.lastUpdate === this.uptime.started) {
      return 100;
    }
    return Math.round((this.uptime.up / (this.uptime.lastUpdate - this.uptime.started)) * 100);
  }

  getBlockNumber() {
    return this.stats.block.number;
  }

  canUpdate() {
    if (this.trusted) {
      return true;
    }
    // return (this.info.canUpdateHistory && this.trusted) || false;
    return this.info.canUpdateHistory || (this.stats.syncing === false && this.stats.peers > 0) || false;
  }

  isInactiveAndOld() {
    if (this.uptime.lastStatus === false && this.uptime.lastUpdate !== null && _.now() - this.uptime.lastUpdate > this.MAX_INACTIVE_TIME) {
      return true;
    }
    return false;
  }
}

export default AkromaNode;
