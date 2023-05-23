const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
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

    //   Get Appointment Options
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
        // ...........
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
      const result = await bookingCollections.insertOne(booking);
      res.send(result);
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
