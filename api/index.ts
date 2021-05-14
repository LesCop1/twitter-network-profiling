import next from "next";
import express from "express";
import { createServer } from "http";
import bodyParser from "body-parser";
import apiRoutes from "./routes";
import { PythonShell } from "python-shell";

const app = express();
const server = createServer(app);

const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev });
const nextHandler = nextApp.getRequestHandler();

nextApp.prepare().then(async () => {
  try {
    app.use(bodyParser.json());
    app.use(express.json());

    await new Promise<void>((resolve, reject) => {
      PythonShell.run("./api/scripts/install_twint.py", {}, (err, result) => {
        if (!err && result) resolve();
        reject(err);
      });
    });

    app.use("/api", apiRoutes);

    app.all("*", (req, res) => {
      return nextHandler(req, res);
    });

    server.listen(3000, () => {
      console.log(`API Server | Running on port 3000`);
    });
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
});
