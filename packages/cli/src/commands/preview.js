const chalk = require("chalk");
const path = require("path");
const fs = require("fs");
const express = require("express");
const http = require("http");
const getPort = require("get-port");
const openBrowser = require("@includable/open-browser");
const socketio = require("socket.io");
const chokidar = require("chokidar");
const macaw = require("@macaw-email/engine");

const { log, error } = require("../util/log");
const { getTemplates } = require("../util/fs");

const render = (socket, engine, [template, data]) => {
  try {
    socket.emit("render", engine.template(template, data).render());
  } catch (e) {
    socket.emit("render-error", e.message);
  }
};

module.exports = async (dir = "emails") => {
  const emailsPath = path.resolve(dir);

  // First check if there isn't already an "emails" directory
  if (!fs.existsSync(emailsPath)) {
    error(
      "Hold on!",
      'The directory "' +
        dir +
        "\" doesn't seem to exist here.\n\n" +
        "Run " +
        chalk.blue("npx macaw init") +
        " first to set up your project."
    );
    process.exit(1);
  }

  const engine = macaw({
    templatesDirectory: emailsPath
  });

  const port = await getPort({ port: getPort.makeRange(4000, 4100) });
  log(`Starting local previewer on port ${port}...`);

  const app = express();
  const srv = http.createServer(app);
  const io = socketio(srv);

  app.use(
    express.static(
      path.resolve(
        __dirname,
        "..",
        "..",
        "node_modules",
        "@macaw-email",
        "preview-ui",
        "build"
      )
    )
  );

  io.on("connection", socket => {
    socket.emit("templates", getTemplates(emailsPath));
    socket.on("data", data => {
      socket.latestPayload = data;
      render(socket, engine, data);
    });
  });

  chokidar
    .watch(emailsPath, {
      ignored: /(^|[\/\\])\../,
      ignoreInitial: true
    })
    .on("all", () => {
      setTimeout(() => {
        try {
          io.emit("templates", getTemplates(emailsPath));
          for (const socket of Object.values(io.sockets.connected)) {
            if (socket.latestPayload) {
              render(socket, engine, socket.latestPayload);
            }
          }
        } catch (e) {
          log(e);
        }
      }, 100);
    });

  srv.listen(port, function() {
    openBrowser(`http://localhost:${port}/`);
  });
};
