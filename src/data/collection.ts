import _ from "lodash";
import Primus from "primus";
import { WebSocketServer } from "ws";
import { Block, Stats } from "../model";
import AkromaNode from "./AkromaNode";
import History from "./history";

class Collection {
  items: AkromaNode[] = [];
  blockchain = new History(); // TODO: rename history to blockchain?
  askedForHistory = false;
  askedForHistoryTime = 0;
  debounced = null;
  externalAPI: WebSocketServer;
  highestBlock = 0;
  _blockchain: any;
  constructor(externalAPI: WebSocketServer) {
    this.externalAPI = externalAPI;
  }

  setupSockets() {
    this.externalAPI.on("connection", (spark: Primus.Spark) => {
      spark.on("data", (data) => {
        spark.emit("latestBlock", {
          number: this.highestBlock,
        });
      });
    });
  }

  add(data: any, callback: Function) {
    var node = this.getNodeOrNew({ id: data.id }, data);
    if (node !== null) {
      node.setInfo(data, callback);
    } else {
      console.debug("unable to add node");
    }
  }

  update(id: string, stats: Stats, callback: Function) {
    var node = this.getNode({ id: id });

    if (!node) {
      callback("Node not found", null);
    } else {
      // this.blockchain.clean(this.getBestBlockFromItems());

      var block = this.blockchain.add(stats.block, id, node.trusted);

      if (!block) {
        callback("Block data wrong", null);
      } else {
        var propagationHistory = this.blockchain.getNodePropagation(id);

        stats.block.arrived = block.block.arrived;
        stats.block.received = block.block.received;
        stats.block.propagation = block.block.propagation;

        node.setStats(stats, propagationHistory, callback);
      }
    }
  }

  addBlock(id: string, stats: any, callback: Function) {
    var node = this.getNode({ id: id });

    if (!node) {
      callback("Node not found", null);
    } else {
      // this.blockchain.clean(this.getBestBlockFromItems());

      var block = this.blockchain.add(stats, id, node.trusted);

      if (!block) {
        callback("Block undefined", null);
      } else {
        var propagationHistory = this.blockchain.getNodePropagation(id);

        stats.arrived = block.block.arrived;
        stats.received = block.block.received;
        stats.propagation = block.block.propagation;

        if (block.block.number > this.highestBlock) {
          this.highestBlock = block.block.number;
          // this.externalAPI.write({
          //   action: "lastBlock",
          //   number: this.highestBlock,
          // });
        }

        node.setBlock(stats, propagationHistory, callback);
      }
    }
  }

  updatePending(id: string, stats: any, callback: Function) {
    var node = this.getNode({ id: id });

    if (!node) return false;

    node.setPending(stats, callback);
  }

  updateStats(id: string, stats: any, callback: Function) {
    var node = this.getNode({ id: id });

    if (!node) {
      callback("Node not found", null);
    } else {
      node.setBasicStats(stats, callback);
    }
  }

  // TODO: Async series
  addHistory(id: string, blocks: Block[], callback: Function) {
    var node = this.getNode({ id: id });

    if (!node) {
      callback("Node not found", null);
    } else {
      blocks = blocks.reverse();

      // this.blockchain.clean(this.getBestBlockFromItems());

      for (var i = 0; i <= blocks.length - 1; i++) {
        this.blockchain.add(blocks[i], id, node.trusted, true);
      }

      this.getCharts();
    }

    this.hasBeenAskedForHistory(false);
  }

  updateLatency(id: string, latency: any, callback: Function) {
    var node = this.getNode({ id: id });

    if (!node) return false;

    node.setLatency(latency, callback);
  }

  inactive(id: string, callback: Function) {
    var node = this.getNode({ spark: id });

    if (!node) {
      callback("Node not found", null);
    } else {
      node.setState(false);
      callback(null, node.getStats());
    }
  }

  getIndex(search: Object) {
    return _.findIndex(this.items, search);
  }

  getNode(search: Object) {
    var index = this.getIndex(search);

    if (index >= 0) return this.items[index];

    return false;
  }

  getNodeByIndex(index: number): AkromaNode | null {
    if (this.items[index]) {
      return this.items[index];
    }
    return null;
  }

  getIndexOrNew(search: Object, data: any) {
    var index = this.getIndex(search);

    return index >= 0 ? index : this.items.push(new AkromaNode(data)) - 1;
  }

  getNodeOrNew(search: Object, data: any) {
    return this.getNodeByIndex(this.getIndexOrNew(search, data));
  }

  all() {
    this.removeOldNodes();

    return this.items;
  }

  removeOldNodes() {
    var deleteList = [];

    for (var i = this.items.length - 1; i >= 0; i--) {
      if (this.items[i].isInactiveAndOld()) {
        deleteList.push(i);
      }
    }

    if (deleteList.length > 0) {
      for (var i = 0; i < deleteList.length; i++) {
        this.items.splice(deleteList[i], 1);
      }
    }
  }

  blockPropagationChart() {
    return this.blockchain.getBlockPropagation();
  }

  getUncleCount() {
    return this.blockchain.getUncleCount();
  }

  setChartsCallback(callback: Function) {
    this.blockchain.setCallback(callback);
  }

  getCharts() {
    this.getChartsDebounced();
  }

  getChartsDebounced() {
    var self = this;

    if (this.debounced === null) {
      // this.debounced =
      _.debounce(
        function () {
          self._blockchain.getCharts();
        },
        1000,
        {
          leading: false,
          maxWait: 5000,
          trailing: true,
        }
      );
    }

    // this.debounced();
  }

  getHistory() {
    return this.blockchain;
  }

  getBestBlockFromItems() {
    return Math.max(
      this.blockchain.bestBlockNumber(),
      _.result(
        _.maxBy(this.items, (x) => x.stats.block.number),
        "stats.block.number",
        0
      )
    );
  }

  canNodeUpdate(id: string) {
    var node = this.getNode({ id: id });

    if (!node) return false;

    if (node.canUpdate()) {
      var diff = node.getBlockNumber() - this.blockchain.bestBlockNumber();

      return Boolean(diff >= 0);
    }

    return false;
  }

  requiresUpdate(id: string) {
    return this.canNodeUpdate(id) && this.blockchain.requiresUpdate() && (!this.askedForHistory || _.now() - this.askedForHistoryTime > 2 * 60 * 1000);
  }

  hasBeenAskedForHistory(set: boolean | undefined) {
    if (!_.isUndefined(set)) {
      this.askedForHistory = set;

      if (set === true) {
        this.askedForHistoryTime = _.now();
      }
    }

    return this.askedForHistory || _.now() - this.askedForHistoryTime < 2 * 60 * 1000;
  }
}

export default Collection;
