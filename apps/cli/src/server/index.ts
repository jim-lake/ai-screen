import express from "express";
import http from "node:http";
import errorhandler from "errorhandler";
import bodyParser from "body-parser";

import routes from "./routes";

import { log, errorLog } from "../tools/log";

import type { Request, Response, NextFunction } from "express";

const PORT = process.env.PORT ?? 6847;

const g_app = express();

g_app.enable("trust proxy");
g_app.set("port", PORT);

g_app.get("/status_check", _statusCheck);

g_app.use(_allowCrossDomain);
g_app.use(_allowText);
g_app.use(bodyParser.json());
g_app.use(bodyParser.urlencoded({ extended: true }));

g_app.get("/quit", _quit);

g_app.use(routes.router);
g_app.use(_throwHandler);

http.createServer(g_app).listen(PORT, function () {
  log("cli-server listening on port:", PORT);
});

function _quit(req: Request, res: Response) {
  res.header("Cache-Control", "no-cache, no-store, must-revalidate");
  log("cli-server: quitting!");
  res.sendStatus(200);
  process.exit(0);
}
function _statusCheck(req: Request, res: Response) {
  res.header("Cache-Control", "no-cache, no-store, must-revalidate");
  res.sendStatus(200);
}
function _allowCrossDomain(req: Request, res: Response, next: NextFunction) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "content-type,accept");
  res.header("Access-Control-Max-Age", "3600");
  if (req.method === "OPTIONS") {
    res.header("Cache-Control", "no-cache,no-store,must-revalidate");
    res.sendStatus(204);
  } else {
    next();
  }
}
function _allowText(req: Request, res: Response, next: NextFunction) {
  if (req.is("text/plain")) {
    req.headers["content-type"] = "application/json";
  }
  next();
}

interface HttpError extends Error {
  code?: number;
  body?: string;
}
function _throwHandler(
  err: HttpError,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (err.code && err.body && typeof err.code === "number") {
    res.header("Cache-Control", "no-cache, no-store, must-revalidate");
    res.status(err.code).send(err.body);
  } else {
    errorLog("cli-server._throwHandler: err:", err);
    res.header("Cache-control", "no-cache, no-store, must-revalidate");
    errorhandler()(err, req, res, next);
  }
}
