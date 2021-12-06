export class Stats {
  active: boolean = false;
  mining: boolean = false;
  hashrate: number = 0;
  peers: number = 0;
  pending: number = 0;
  gasPrice: number = 0;
  block: Block = new Block();
  syncing: boolean = false;
  propagationAvg: number = 0;
  latency: number = 0;
  uptime: number = 0;
  arrived: number = 0;
  received: number = 0;
  propagation: number = 0;
}

export class Block {
  number: number = 0;
  hash: string = "";
  difficulty: number = 0;
  totalDifficulty: number = 0;
  gasLimit: number = 0;
  timestamp: number = 0;
  time: number = 0;
  arrival: number = 0;
  received: number = 0;
  propagation: number = 0;
  transactions: never[] = [];
  uncles: never[] = [];

  // number: number = 0;
  // uncles: never[] = [];
  // transactions: never[] = [];
  // difficulty: number = 0;
  // received: number = 0;
  // propagation: number = 0;
  // time: number = 0;
  // timestamp: number = 0;

  trusted: boolean = false;
  arrived: number = 0;
  fork: number = 0;
  forks: any;
  propagTimes: PropagationTime[] = [];
  block: any;
  parentHash: any;
  sha3Uncles: any;
  transactionsRoot: any;
  stateRoot: any;
  miner: any;
  height: number = 0;
}

export class PropagationTime {
  node: string = "";
  trusted: boolean = false;
  fork: number = 0;
  received: number = 0;
  propagation: number = 0;
}

export class Uptime {
  started: number = 0;
  up: number = 0;
  down: number = 0;
  lastStatus: number | boolean = false;
  lastUpdate: number = 0;
}
