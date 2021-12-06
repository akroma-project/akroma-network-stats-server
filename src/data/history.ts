import _ from "lodash";
import d3 from "d3";
import { Block } from "../model";

class History {
  MAX_HISTORY = 2000;
  MAX_PEER_PROPAGATION = 40;
  MIN_PROPAGATION_RANGE = 0;
  MAX_PROPAGATION_RANGE = 10000;
  MAX_UNCLES = 1000;
  MAX_UNCLES_PER_BIN = 25;
  MAX_BINS = 40;
  private _items: Block[];
  private _callback: Function | null;

  constructor() {
    this._items = [];
    this._callback = null;
  }

  add(block: Block, id: string, trusted: boolean, addingHistory: boolean = false) {
    var changed = false;

    if (!_.isUndefined(block) && !_.isUndefined(block.number) && !_.isUndefined(block.uncles) && !_.isUndefined(block.transactions) && !_.isUndefined(block.difficulty) && block.number > 0) {
      trusted = process.env.LITE === "true" ? true : trusted;
      var historyBlock = this.search(block.number);
      var forkIndex = -1;

      var now = _.now();

      block.trusted = trusted;
      block.arrived = now;
      block.received = now;
      block.propagation = 0;
      block.fork = 0;

      if (historyBlock) {
        // We already have a block with this height in collection

        // Check if node already checked this block height
        var propIndex = _.findIndex(historyBlock.propagTimes, { node: id });

        // Check if node already check a fork with this height
        forkIndex = this.compareForks(historyBlock, block);

        if (propIndex === -1) {
          // Node didn't submit this block before
          if (forkIndex >= 0 && !_.isUndefined(historyBlock.forks[forkIndex])) {
            // Found fork => update data
            block.arrived = historyBlock.forks[forkIndex].arrived;
            block.propagation = now - historyBlock.forks[forkIndex].received;
          } else {
            // No fork found => add a new one
            const prevBlock = this.prevMaxBlock(block.number);

            if (prevBlock) {
              block.time = Math.max(block.arrived - prevBlock.block.arrived, 0);
              const bestBlock = this.bestBlock();
              if (bestBlock !== undefined && block.number < bestBlock.height) {
                block.time = Math.max((block.timestamp - prevBlock.block.timestamp) * 1000, 0);
              }
            } else {
              block.time = 0;
            }

            forkIndex = historyBlock.forks.push(block) - 1;
            historyBlock.forks[forkIndex].fork = forkIndex;
          }

          // Push propagation time
          historyBlock.propagTimes.push({
            node: id,
            trusted: trusted,
            fork: forkIndex,
            received: now,
            propagation: block.propagation,
          });
        } else {
          // Node submited the block before
          if (forkIndex >= 0 && !_.isUndefined(historyBlock.forks[forkIndex])) {
            // Matching fork found => update data
            block.arrived = historyBlock.forks[forkIndex].arrived;

            if (forkIndex === historyBlock.propagTimes[propIndex].fork) {
              // Fork index is the same
              block.received = historyBlock.propagTimes[propIndex].received;
              block.propagation = historyBlock.propagTimes[propIndex].propagation;
            } else {
              // Fork index is different
              historyBlock.propagTimes[propIndex].fork = forkIndex;
              historyBlock.propagTimes[propIndex].propagation = block.propagation = now - historyBlock.forks[forkIndex].received;
            }
          } else {
            // No matching fork found => replace old one
            block.received = historyBlock.propagTimes[propIndex].received;
            block.propagation = historyBlock.propagTimes[propIndex].propagation;

            var prevBlock = this.prevMaxBlock(block.number);

            if (prevBlock) {
              block.time = Math.max(block.arrived - prevBlock.block.arrived, 0);
              const bestBlock = this.bestBlock();
              if (bestBlock !== undefined && block.number < bestBlock.height) {
                block.time = Math.max((block.timestamp - prevBlock.block.timestamp) * 1000, 0);
              }
            } else {
              block.time = 0;
            }

            forkIndex = historyBlock.forks.push(block) - 1;
            historyBlock.forks[forkIndex].fork = forkIndex;
          }
        }

        if (trusted && !this.compareBlocks(historyBlock.block, historyBlock.forks[forkIndex])) {
          // If source is trusted update the main block
          historyBlock.forks[forkIndex].trusted = trusted;
          historyBlock.block = historyBlock.forks[forkIndex];
        }

        block.fork = forkIndex;

        changed = true;
      } else {
        // Couldn't find block with this height

        // Getting previous max block
        var prevBlock = this.prevMaxBlock(block.number);

        if (prevBlock) {
          block.time = Math.max(block.arrived - prevBlock.block.arrived, 0);
          let bestBlock = this.bestBlock();
          if (bestBlock !== undefined && block.number < bestBlock.height) {
            block.time = Math.max((block.timestamp - prevBlock.block.timestamp) * 1000, 0);
          }
        } else {
          block.time = 0;
        }

        var item = new Block();
        item.height = block.number;
        item.block = block;
        item.forks = [block];

        if (this._items.length === 0 || (this._items.length === this.MAX_HISTORY && block.number > this.worstBlockNumber()) || (this._items.length < this.MAX_HISTORY && block.number < this.bestBlockNumber() && addingHistory)) {
          item.propagTimes.push({
            node: id,
            trusted: trusted,
            fork: 0,
            received: now,
            propagation: block.propagation,
          });

          this._save(item);

          changed = true;
        }
      }

      return {
        block: block,
        changed: changed,
      };
    }

    return false;
  }

  private compareBlocks(block1: Block, block2: Block) {
    if (
      block1.hash !== block2.hash ||
      block1.parentHash !== block2.parentHash ||
      block1.sha3Uncles !== block2.sha3Uncles ||
      block1.transactionsRoot !== block2.transactionsRoot ||
      block1.stateRoot !== block2.stateRoot ||
      block1.miner !== block2.miner ||
      block1.difficulty !== block2.difficulty ||
      block1.totalDifficulty !== block2.totalDifficulty
    )
      return false;

    return true;
  }

  private compareForks(historyBlock: Block, block2: Block) {
    if (_.isUndefined(historyBlock)) return -1;

    if (_.isUndefined(historyBlock.forks) || historyBlock.forks.length === 0) return -1;

    for (var x = 0; x < historyBlock.forks.length; x++) if (this.compareBlocks(historyBlock.forks[x], block2)) return x;

    return -1;
  }

  _save(block: Block) {
    this._items.unshift(block);

    this._items = _.sortBy(this._items, "height");

    if (this._items.length > this.MAX_HISTORY) {
      this._items.pop();
    }
  }

  clean(max: number) {
    if (max > 0 && this._items.length > 0 && max < this.bestBlockNumber()) {
      console.log("MAX:", max);

      console.log("History items before:", this._items.length);

      this._items = _(this._items)
        .filter(function (item) {
          return item.height <= max && item.block.trusted === false;
        })
        .value();

      console.log("History items after:", this._items.length);
    }
  }

  search(number: number) {
    var index = _.findIndex(this._items, (x) => x.height == -number);

    if (index < 0) return false;

    return this._items[index];
  }

  prevMaxBlock(number: number) {
    var index = _.findIndex(this._items, function (item) {
      return item.height < number;
    });

    if (index < 0) return false;

    return this._items[index];
  }

  bestBlock(): Block | undefined {
    return _.maxBy(this._items, (x) => x.height);
  }

  bestBlockNumber() {
    var best = this.bestBlock();

    if (!_.isUndefined(best?.height)) {
      return best?.height ?? 0;
    }

    return 0;
  }

  worstBlock() {
    return _.minBy(this._items, "height");
  }

  worstBlockNumber() {
    var worst = this.worstBlock();

    if (!_.isUndefined(worst?.height)) {
      return worst?.height ?? 0;
    }

    return 0;
  }

  getNodePropagation(id: string) {
    var propagation = new Array(this.MAX_PEER_PROPAGATION);
    var bestBlock = this.bestBlockNumber();
    var lastBlocktime = _.now();

    _.fill(propagation, -1);

    // var sorted = _(this._items)
    //   .sortBy("height")
    //   .slice(0, this.MAX_PEER_PROPAGATION)
    //   .forEach(function (item, key) {
    //     var index = this.MAX_PEER_PROPAGATION - 1 - bestBlock + item.height;

    //     if (index >= 0) {
    //       var tmpPropagation = _.result(_.find(item.propagTimes, "node", id), "propagation", false);

    //       if (_.result(_.find(item.propagTimes, "node", id), "propagation", false) !== false) {
    //         propagation[index] = tmpPropagation;
    //         lastBlocktime = item.block.arrived;
    //       } else {
    //         propagation[index] = Math.max(0, lastBlocktime - item.block.arrived);
    //       }
    //     }
    //   })
    //   .reverse()
    //   .value();

    return propagation;
  }

  getBlockPropagation() {
    var propagation: number[] = [];
    var avgPropagation = 0;

    this._items.forEach((block, index) => {
      block.propagTimes.forEach((p, index) => {
        var prop = Math.min(this.MAX_PROPAGATION_RANGE, _.result(p, "propagation", -1));

        if (prop >= 0) {
          propagation.push(prop);
        }
      });
    });

    if (propagation.length > 0) {
      var avgPropagation = Math.round(_.sum(propagation) / propagation.length);
    }

    // TODO: Update D3
    // var data = d3.histogram().frequency(false).range([this.MIN_PROPAGATION_RANGE, this.MAX_PROPAGATION_RANGE]).bins(this.MAX_BINS)(propagation);

    // var freqCum = 0;
    // var histogram = data.map((val) => {
    //         freqCum += val.length;
    //         var cumPercent = freqCum / Math.max(1, propagation.length);

    //         return {
    //             x: val.x,
    //             dx: val.dx,
    //             y: val.y,
    //             frequency: val.length,
    //             cumulative: freqCum,
    //             cumpercent: cumPercent,
    //         };
    //     });

    return {
      histogram: null,
      avg: avgPropagation,
    };
  }

  getUncleCount() {
    var uncles = _(this._items)
      .sortBy("height")
      // .filter(function (item)
      // {
      // 	return item.block.trusted;
      // })
      .slice(0, this.MAX_UNCLES)
      .map(function (item) {
        return item.block.uncles.length;
      })
      .value();

    var uncleBins = _.fill(Array(this.MAX_BINS), 0);

    var sumMapper = (array: _.List<any> | null | undefined, key: number) => {
      uncleBins[key] = _.sum(array);
      return _.sum(array);
    };

    _.map(_.chunk(uncles, this.MAX_UNCLES_PER_BIN), sumMapper);

    return uncleBins;
  }

  getBlockTimes() {
    var blockTimes = _(this._items)
      .sortBy("height")
      // .filter(function (item)
      // {
      // return item.block.trusted;
      // })
      .slice(0, this.MAX_BINS)
      .reverse()
      .map((item) => item.block.time / 1000)
      .value();

    return blockTimes;
  }

  getAvgBlocktime() {
    var blockTimes = _(this._items)
      .sortBy("height")
      // .filter(function (item)
      // {
      // return item.block.trusted;
      // })
      // .slice(0, MAX_BINS)
      .reverse()
      .map((item) => item.block.time / 1000)
      .value();

    return _.sum(blockTimes) / (blockTimes.length === 0 ? 1 : blockTimes.length);
  }

  getGasLimit() {
    var gasLimitHistory = _(this._items)
      .sortBy("height")
      // .filter(function (item)
      // {
      // 	return item.block.trusted;
      // })
      .slice(0, this.MAX_BINS)
      .reverse()
      .map(function (item) {
        return item.block.gasLimit;
      })
      .value();

    return gasLimitHistory;
  }

  getDifficulty() {
    var difficultyHistory = _(this._items)
      .sortBy("height")
      .filter((item) => item.block.trusted)
      .slice(0, this.MAX_BINS)
      .reverse()
      .map(function (item) {
        return item.block.difficulty;
      })
      .value();

    return difficultyHistory;
  }

  getTransactionsCount() {
    var txCount = _(this._items)
      .sortBy("height")
      .filter((item) => item.block.trusted)
      .slice(0, this.MAX_BINS)
      .reverse()
      .map(function (item) {
        return item.block.transactions.length;
      })
      .value();

    return txCount;
  }

  getGasSpending() {
    var gasSpending = _(this._items)
      .sortBy("height")
      .filter((item) => item.block.trusted)
      .slice(0, this.MAX_BINS)
      .reverse()
      .map(function (item) {
        return item.block.gasUsed;
      })
      .value();

    return gasSpending;
  }

  getAvgHashrate() {
    if (_.isEmpty(this._items)) return 0;

    var blocktimeHistory = _(this._items)
      .sortBy("height")
      // .filter(function (item)
      // {
      // 	return item.block.trusted;
      // })
      .slice(0, 64)
      .map((item) => item.block.time)
      .value();

    var avgBlocktime = _.sum(blocktimeHistory) / blocktimeHistory.length / 1000;
    const bestBlock = this.bestBlock();
    if (!bestBlock) {
      throw "missing best block!";
    }
    return bestBlock.block.difficulty / avgBlocktime;
  }

  getMinersCount() {
    var miners = _(this._items)
      .sortBy("height")
      // .filter(function (item)
      // {
      // 	return item.block.trusted;
      // })
      .slice(0, this.MAX_BINS)
      .map((item) => item.block.miner)
      .value();

    var minerCount: any = [];

    _.forEach(_.countBy(miners), function (cnt, miner) {
      minerCount.push({ miner: miner, name: false, blocks: cnt });
    });

    return _(minerCount).sortBy("blocks").slice(0, 2).value();
  }

  setCallback (callback: Function)
  {
  	this._callback = callback;
  }

  getStats() {
    var chartHistory = _(this._items)
      .sortBy("height")
      // .filter(function (item)
      // {
      // 	return item.block.trusted;
      // })
      .slice(0, this.MAX_BINS)
      .reverse()
      .map(function (item) {
        return {
          height: item.height,
          blocktime: item.block.time / 1000,
          difficulty: item.block.difficulty,
          uncles: item.block.uncles.length,
          transactions: item.block.transactions.length,
          gasSpending: item.block.gasUsed,
          gasLimit: item.block.gasLimit,
          miner: item.block.miner,
        };
      })
      .value();

    var item = {
      height: chartHistory.map((x) => x.height),
      blocktime: chartHistory.map((x) => x.blocktime),
      avgBlocktime: this.getAvgBlocktime(),
      difficulty: chartHistory.map((x) => x.difficulty),
      miners: this.getMinersCount(),
      avgHashrate: this.getAvgHashrate(),
    };

    return item;
  }

  getCharts() {
    if (this._callback !== null) {
      var chartHistory = _(this._items)
        .sortBy("height")
        // .filter(function (item)
        // {
        // 	return item.block.trusted;
        // })
        .slice(0, this.MAX_BINS)
        .reverse()
        .map(function (item) {
          return {
            height: item.height,
            blocktime: item.block.time / 1000,
            difficulty: item.block.difficulty,
            uncles: item.block.uncles.length,
            transactions: item.block.transactions.length,
            gasSpending: item.block.gasUsed,
            gasLimit: item.block.gasLimit,
            miner: item.block.miner,
          };
        })
        .value();

      this._callback(null, {
        height: chartHistory.map((x) => x.height),
        blocktime: chartHistory.map((x) => x.blocktime),
        // avgBlocktime : _.sum(_.pluck( chartHistory, 'blocktime' )) / (chartHistory.length === 0 ? 1 : chartHistory.length),
        avgBlocktime: this.getAvgBlocktime(),
        difficulty: chartHistory.map((x) => x.difficulty),
        uncles: chartHistory.map((x) => x.uncles),
        transactions: chartHistory.map((x) => x.transactions),
        gasSpending: chartHistory.map((x) => x.gasSpending),
        gasLimit: chartHistory.map((x) => x.gasLimit),
        miners: this.getMinersCount(),
        propagation: this.getBlockPropagation(),
        uncleCount: this.getUncleCount(),
        avgHashrate: this.getAvgHashrate(),
      });
    }
  }

  requiresUpdate() {
    // return ( this._items.length < MAX_HISTORY && !_.isEmpty(this._items) );
    return this._items.length < this.MAX_HISTORY;
  }

  getHistoryRequestRange() {
    if (this._items.length < 2) return false;

    var blocks = this._items.map((x) => x.height);
    var best = _.max(blocks) ?? 0; // TODO: SHOULD THIS EVER BE ZERO?
    var range = _.range(_.max([0, best - this.MAX_HISTORY]) ?? 0, best + 1); // TODO: added " ?? 0" (review!)

    var missing = _.difference(range, blocks);

    var max = _.max(missing) ?? 0; // TODO: added " ?? 0" (review!)
    var min = max - Math.min(50, this.MAX_HISTORY - this._items.length + 1) + 1;

    return {
      max: max,
      min: min,
      list: _(missing).reverse().slice(0, 50).reverse().value(),
    };
  }
}

export default History;
