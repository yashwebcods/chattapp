import express from 'express';
import dotenv from 'dotenv';
import connectDB from './Config/mongoose.js';
import cookieParser from 'cookie-parser';
import cors from "cors"
import path from 'path'

import authRouter from './Routes/auth.route.js';
import messsageRoute from './Routes/message.route.js';
import sellerRoute from './Routes/seller.route.js';
import groupRoute from './Routes/group.route.js';
import { app, server } from './lib/socket.js';
dotenv.config();

 const isDev = process.env.NODE_ENV !== 'production';
 const debug = (...args) => {
  if (isDev) console.log(...args);
 };

connectDB();
const port = process.env.PORT || 8001;
const __dirname = path.resolve()

app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true
}));

app.use("/api/auth", authRouter);
app.use("/api/message", messsageRoute);
app.use("/api/seller", sellerRoute);
app.use("/api/group", groupRoute);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, '../FrontEnd/dist/')))

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../FrontEnd", "dist", "index.html"))
  })
}

server.listen(port, (err) => {
  if (err) {
    console.error(err);
    return false;

  }
  debug('server is connected', port);

})
export default app;
