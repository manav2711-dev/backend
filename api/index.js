const express = require('express')
const mongoose = require('mongoose')
const dotenv = require('dotenv')
const cors = require('cors')
const session = require("express-session");
const os = require("os");
dotenv.config()


const { router: syncProductsRoute, syncProducts } = require("./routes/syncProducts");
const authRouter = require('./routes/auth') 
const userRouter = require('./routes/user') 
const productRouter = require('./routes/product') 
const cartRouter = require('./routes/cart') 
const orderRouter = require('./routes/order')
const checkoutRouter = require('./routes/checkout')
const paymentRouter = require('./routes/payment')
const { 
  handleMalformedJson,
  formatCelebrateErrors
} = require('./middlewares/handleError')
const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0";

const app = express()


// mongodb
mongoose.connect(process.env.DB_URL, {
  useUnifiedTopology: true,
  useNewUrlParser: true
}).then(() => console.log("Connected to database"),
  //  syncProducts(),
)
	.catch(err => console.error(err))


// global middlewares
app.use(cors())
app.use(express.json())
app.use(handleMalformedJson) // handle common req errors
app.use(
  session({
    name: "pm.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,          // true only if HTTPS
      maxAge: 15 * 60 * 1000  // 15 minutes
    }
  })
);


// routes
app.use("/auth", authRouter)
app.use("/users", userRouter)
app.use("/sync-products", syncProductsRoute);
app.use("/products", productRouter)
app.use("/carts", cartRouter)
app.use("/orders", orderRouter)
app.use("/checkout", checkoutRouter)
app.use("/payment",paymentRouter)

app.use((err, req, res, next) => {
  if (err && err.joi) {
    console.error("⚠️ Joi validation error:", err.joi.details);
  }
  next(err);
});

const { errors } = require("celebrate");
app.use(errors());

// 🟠 Handle any other errors and log them
app.use((err, req, res, next) => {
  console.error("🔥 Error caught:", err);

  // Celebrate validation errors already handled above, so this is for all others
  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || 500).json({
    status: "error",
    message: err.message || "Internal server error",
  });
});

// server status
app.get("/", (req, res) => {
	res.json({status: "ok"})
})

// format celebrate paramater validation errors
app.use(formatCelebrateErrors)

app.listen(PORT,HOST, () => {
	console.log(`Server listening on port ${PORT}`);
  printIPs(PORT);
})

function printIPs(port) {
  const interfaces = os.networkInterfaces();

  Object.keys(interfaces).forEach((ifaceName) => {
    interfaces[ifaceName].forEach((iface) => {
      if (iface.family === "IPv4" && !iface.internal) {
        console.log(`→ http://${iface.address}:${port}`);
      }
    });
  });
}