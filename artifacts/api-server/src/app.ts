import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
// Allow Vercel frontend + local dev. Set CORS_ORIGIN in Railway/Render env vars.
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
  : ["http://localhost:5173", "http://localhost:3000"];

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (curl, mobile apps, same-origin)
      if (!origin) return cb(null, true);
      if (corsOrigins.some((o) => origin === o || origin.endsWith(".vercel.app"))) {
        return cb(null, true);
      }
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  }),
);
// Increase body limit to support base64 image/video messages (up to 50MB)
app.use(express.json({ limit: "52mb" }));
app.use(express.urlencoded({ extended: true, limit: "52mb" }));

app.use("/api", router);

export default app;
