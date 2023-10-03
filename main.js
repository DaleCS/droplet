const path = require("path");
const fs = require("fs");
const https = require("https");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const HTTPS_PORT = process.env.NODE_ENV === "production" ? 443 : 5000;
const HTTP_PORT = process.env.NODE_ENV === "production" ? 80 : 5001;

(async () => {
  const SSL_KEY = fs.readFileSync(
    path.resolve(__dirname, "privKey.pem"),
    "utf-8"
  );
  const SSL_CERT = fs.readFileSync(
    path.resolve(__dirname, "cert.pem"),
    "utf-8"
  );

  const app = express();

  app.use(
    cors({
      origin: "*",
      methods: ["GET"],
    })
  );
  app.use(helmet());
  app.use((req, _, next) => {
    const ipAddress = req.header("x-forwarded-for")
      ? req.header("x-forwarded-for")
      : req.socket.remoteAddress;
    console.log(`[server]: ${req.method} ${req.originalUrl} ${ipAddress}`);
    next();
  });
  app.use(
    "/.well-known",
    express.static(path.resolve(__dirname, ".well-known"))
  );
  app.use(express.static(path.resolve(__dirname, "public")));

  https
    .createServer(
      {
        key: SSL_KEY,
        cert: SSL_CERT,
      },
      app
    )
    .listen(HTTPS_PORT, () => {
      console.log("[server]: Server up and listening to port: " + HTTPS_PORT);
    });

  if (process.env.NODE_ENV === "production") {
    const httpApp = express();

    httpApp.use(
      cors({
        origin: "*",
        methods: ["GET"],
      })
    );
    httpApp.use(helmet());
    httpApp.use((req, res, next) => {
      res.redirect("https://" + req.headers.host + req.path);
    });

    httpApp.listen(HTTP_PORT, () => {
      console.log("[server]: Proxy up and listening to port: " + HTTP_PORT);
    });
  }
})();
