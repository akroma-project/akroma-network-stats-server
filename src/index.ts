import _ from "lodash";
import Collection from "./data/collection";
import { WebSocket } from "ws";

const WS_SECRET = "test";

// const server = http.createServer(app);
// Init API Socket connection

const server = new WebSocket.Server({ port: 3000, path: "/api" });

// const primus = new Primus(server, {
//   transformer: "websockets",
//   pathname: "/api",
//   parser: "JSON",
// });

var nodes = new Collection(server);
// app.get("/akroma", function (req, res) {
//   res.send(nodes.blockchain.getStats());
// });

nodes.setChartsCallback((err: string, charts: any) => {
  if (err !== null) {
    console.error("COL", "CHR", "Charts error:", err);
  } else {
    console.debug("sending charts:", charts);
    server.emit("charts", charts);
  }
});

// Init API Socket events
server.on("connection", (socket, request) => {
  const ip = request.socket.remoteAddress;
  const id = request.headers["sec-websocket-key"];
  console.debug("API", "CON", "Open:", request.socket.remoteAddress, id);

  socket.on("message", (data) => {
    const incoming = data.toString();
    console.debug(incoming);
    const message = JSON.parse(incoming);
    console.log('received: %s', JSON.stringify(message));
        // if (_.isUndefined(data.secret) || WS_SECRET.indexOf(data.secret) === -1) {
    //   // socket.end(undefined, { reconnect: false });
    //   console.error("API", "CON", "Closed - wrong auth", data);
    //   return false;
    // }
    // if (!_.isUndefined(data.id) && !_.isUndefined(data.info)) {
    //   // data.ip = body.address.ip;
    //   // data.spark = body.id;
    //   data.latency = 0; // TODO: removed spark.latency ||
    //   nodes.add(data, (err: any, info: any) => {
    //     if (err !== null) {
    //       console.error("API", "CON", "Connection error:", err);
    //       return false;
    //     }
    //     if (info !== null) {
    //       socket.emit("ready");
    //       console.info("API", "CON", "Connected", data.id);
    //       server.emit("add", info);
    //       // primus.write({
    //       //   action: "add",
    //       //   data: info,
    //       // });
    //     }
    //   });
    // }
  });

  // spark.on("update", (data) => {
  //   if (!_.isUndefined(data.id) && !_.isUndefined(data.stats)) {
  //     nodes.update(data.id, data.stats, (err: string, stats: any) => {
  //       if (err !== null) {
  //         console.error("API", "UPD", "Update error:", err);
  //       } else {
  //         if (stats !== null) {
  //           api.write({
  //             action: "update",
  //             data: stats,
  //           });

  //           console.info("API", "UPD", "Update from:", data.id, "for:", stats);

  //           nodes.getCharts();
  //         }
  //       }
  //     });
  //   } else {
  //     console.error("API", "UPD", "Update error:", data);
  //   }
  // });

  // spark.on("block", (data) => {
  //   if (!_.isUndefined(data.id) && !_.isUndefined(data.block)) {
  //     nodes.addBlock(data.id, data.block, (err, stats) => {
  //       if (err !== null) {
  //         console.error("API", "BLK", "Block error:", err);
  //       } else {
  //         if (stats !== null) {
  //           api.write({
  //             action: "block",
  //             data: stats,
  //           });

  //           console.success("API", "BLK", "Block:", data.block["number"], "from:", data.id);

  //           nodes.getCharts();
  //         }
  //       }
  //     });
  //   } else {
  //     console.error("API", "BLK", "Block error:", data);
  //   }
  // });

  // spark.on("pending", (data) => {
  //   if (!_.isUndefined(data.id) && !_.isUndefined(data.stats)) {
  //     nodes.updatePending(data.id, data.stats, (err, stats) => {
  //       if (err !== null) {
  //         console.error("API", "TXS", "Pending error:", err);
  //       }

  //       if (stats !== null) {
  //         api.write({
  //           action: "pending",
  //           data: stats,
  //         });

  //         console.info("API", "TXS", "Pending:", data.stats["pending"], "from:", data.id);
  //       }
  //     });
  //   } else {
  //     console.error("API", "TXS", "Pending error:", data);
  //   }
  // });

  // spark.on("stats", function (data) {
  //   if (!_.isUndefined(data.id) && !_.isUndefined(data.stats)) {
  //     nodes.updateStats(data.id, data.stats, (err: any, stats: any) => {
  //       if (err !== null) {
  //         console.error("API", "STA", "Stats error:", err);
  //       } else {
  //         if (stats !== null) {
  //           api.write({
  //             action: "stats",
  //             data: stats,
  //           });

  //           console.info("API", "STA", "Stats from:", data.id);
  //         }
  //       }
  //     });
  //   } else {
  //     console.error("API", "STA", "Stats error:", data);
  //   }
  // });

  // spark.on("history", function (data) {
  //   console.info("API", "HIS", "Got history from:", data.id);

  //   // var time = chalk.reset.cyan(new Date().toJSON()) + " ";
  //   // console.time(time, "COL", "CHR", "Got charts in");

  //   nodes.addHistory(data.id, data.history, (err: any, history: any) => {
  //     // console.timeEnd(time, "COL", "CHR", "Got charts in");
  //     if (err !== null) {
  //       console.error("COL", "CHR", "History error:", err);
  //     } else {
  //       api.write({
  //         action: "charts",
  //         data: history,
  //       });
  //     }
  //   });
  // });

  // spark.on("node-ping", function (data) {
  //   var start = !_.isUndefined(data) && !_.isUndefined(data.clientTime) ? data.clientTime : null;

  //   spark.emit("node-pong", {
  //     clientTime: start,
  //     serverTime: _.now(),
  //   });

  //   console.info("API", "PIN", "Ping from:", data["id"]);
  // });

  // spark.on("latency", (data) => {
  //   if (!_.isUndefined(data.id)) {
  //     nodes.updateLatency(data.id, data.latency, function (err, latency) {
  //       if (err !== null) {
  //         console.error("API", "PIN", "Latency error:", err);
  //       }

  //       if (latency !== null) {
  //         // api.write({
  //         // 	action: 'latency',
  //         // 	data: latency
  //         // });
  //         console.info("API", "PIN", "Latency:", latency, "from:", data.id);
  //       }
  //     });

  //     if (nodes.requiresUpdate(data.id)) {
  //       var range = nodes.getHistory().getHistoryRequestRange();

  //       spark.emit("history", range);
  //       console.info("API", "HIS", "Asked:", data.id, "for history:", range.min, "-", range.max);

  //       nodes.hasBeenAskedForHistory(true);
  //     }
  //   }
  // });

  socket.on("end", () => {
    // nodes.inactive(socket.id, (err: any, stats: any) => {
    //   if (err !== null) {
    //     console.error("API", "CON", "Connection end error:", err);
    //   } else {
    //     wss1.emit('inactive', stats);
    //     // primus.write({
    //     //   action: "inactive",
    //     //   data: stats,
    //     // });
    //     console.warn("API", "CON", "Connection with:", socket.id);
    //   }
    // });
  });
});

// app.get("/", (req, res) => {
//   res.send("Well done!");
// });

// app.listen(3000, () => {
//   console.log("The application is listening on port 3000!");
// });
