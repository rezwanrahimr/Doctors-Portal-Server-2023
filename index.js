const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
var jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.port || 5000;

// MiddleWare
app.use(cors());
app.use(express.json());

// MongoDB

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.15gyc.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Verify JWT
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(403).send({ message: "UnAuthorize" });
  }

  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.JWT_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "UnAuthorize" });
    }

    res.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server
    await client.connect();
    // Appointment Options Collections
    const appointmentOptionsCollections = client
      .db("doctors-portal")
      .collection("appointment-options");
    // Bookings Collections
    const bookingCollections = client
      .db("doctors-portal")
      .collection("bookings");

    // User Collection
    const usersCollections = client
      .db("doctors-portal")
      .collection("users-collections");

    //   Get Appointment Options Original
    /*  app.get("/appointmentOptions", async (req, res) => {
      const date = req.query.date;
      const quary = {};
      const cursor = appointmentOptionsCollections.find(quary);
      const result = await cursor.toArray();
      const bookingQuery = { appointmentDate: date };
      const alreadyBooking = await bookingCollections
        .find(bookingQuery)
        .toArray();
      result.forEach((element) => {
        const optionBooked = alreadyBooking.filter(
          (option) => option.treatmentName === element.name
        );
        // ...........
        const bookSlot = optionBooked.map((element) => element.slots);
        const remaining = element.slots.filter(
          (slot) => !bookSlot.includes(slot)
        );
        element.slots = remaining;
      });
      res.send(result);
    });
 */

    //   Practice
    app.get("/appointmentOptions", async (req, res) => {
      const date = req.query.date;
      const quary = {};
      const cursor = appointmentOptionsCollections.find(quary);
      const result = await cursor.toArray();
      const bookingQuery = { appointmentDate: date };
      const alreadyBooking = await bookingCollections
        .find(bookingQuery)
        .toArray();

      result.forEach((element) => {
        const optionBooked = alreadyBooking.filter(
          (option) => option.treatmentName === element.name
        );
        const bookSlot = optionBooked.map((element) => element.slots);
        const remaining = element.slots.filter(
          (slot) => !bookSlot.includes(slot)
        );
        element.slots = remaining;
      });

      res.send(result);
    });

    // Post Booking
    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      const bookingQuarry = {
        treatmentName: booking?.treatmentName,
        email: booking?.email,
      };
      const check = await bookingCollections.find(bookingQuarry).toArray();
      if (check.length > 0) {
        return res.send({ acknowledge: false });
      }
      const result = await bookingCollections.insertOne(booking);
      res.send(result);
    });

    // Get Appointment
    app.get("/bookings", verifyJWT, async (req, res) => {
      const decoded = res.decoded;
      const { email } = req.query;
      if (decoded.email !== email) {
        return res.status(403).send({ message: "UnAuthorize Access" });
      }
      const quarry = { email: email };
      const cursor = await bookingCollections.find(quarry).toArray();
      res.send(cursor);
    });

    // JWT
    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const quarry = { email: email };
      const cursor = await usersCollections.findOne(quarry);
      if (cursor) {
        const token = jwt.sign({ email }, process.env.JWT_TOKEN, {
          expiresIn: "1h",
        });
        return res.send({ accessToken: token });
      }

      res.status(403).send({ accessToken: "" });
    });
    // Post User
    app.post("/user", async (req, res) => {
      const user = req.body;
      const email = user.email;
      console.log(email);
      const userQuary = { email: email };
      const cursor = await usersCollections.findOne(userQuary);
      if (cursor == null) {
        const result = await usersCollections.insertOne(user);
        return res.send(result);
      }
      res.send({ acknowledged: true });
    });

    // Get all User
    app.get("/users", async (req, res) => {
      const quary = {};
      const result = await usersCollections.find(quary).toArray();
      res.send(result);
    });

    // Make Admin
    app.put("/admin/:id", verifyJWT, async (req, res) => {
      const email = res.decoded.email;
      const quary = { email: email };
      const user = await usersCollections.findOne(quary);
      if (user.role !== "admin") {
        return res.status(403).send({ message: "forbidden" });
      }
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollections.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    // Get Admin User
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const quary = { email: email };
      const user = await usersCollections.findOne(quary);
      res.send({ isAdmin: user.role === "admin" });
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Doctors Portal Server is Running...");
});

app.listen(port, () => {
  console.log(`Doctors Portal Server is Running on : ${port}`);
});
