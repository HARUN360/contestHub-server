const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
var jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express()
const port = process.env.PORT || 5000

// midlewere
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sf3cbqp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    // collection
    const userCollection = client.db('contestHub').collection('users');
    const createCollection = client.db('contestHub').collection('creators');
    const paymentCollection = client.db('contestHub').collection('payments');



    // jwt ralated api---------
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token });
    })

    // midlewere -----jwt3
    const verifytoken = (req, res, next) => {
      console.log('insite verify token', req.headers.authorization);
      if(!req.headers.authorization){
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded ) => {
        if(err){
          return res.status(401).send({ message: 'unauthorized access'})
        }
        req.decoded = decoded;
        next();
      })
    

    }

    
    // use verify admin after verify token
    const verifyAdmin = async (req, res, next) => {
        const email = req.decoded.email;
        const query = {email: email};
        const user = await userCollection.findOne(query);
        const isAdmin = user?.role === 'admin';
        if(!isAdmin){
          return res.status(403).send({message: 'forbiden access'})
        }
        next();

    }


    // user collection api
    app.get('/users/admin/:email', verifytoken, async(req,res)=>{
      const email = req.params.email;
      if(email !== req.decoded.email){
        return res.status(403).send({message: 'forbidden access'})
      }

      const query = {email: email};
      const user = await userCollection.findOne(query);
      let admin = false;
      if(user){
        admin = user?.role === 'admin';
      }
      res.send({ admin });

    })
    app.get('/users/creator/:email', verifytoken, async(req,res)=>{
      const email = req.params.email;
      if(email !== req.decoded.email){
        return res.status(403).send({message: 'forbidden access'})
      }

      const query = {email: email};
      const user = await userCollection.findOne(query);
      let creator = false;
      if(user){
        creator = user?.role === 'creator';
      }
      res.send({ creator });

    })
    app.get('/users/block/:email', verifytoken, async(req,res)=>{
      const email = req.params.email;
      if(email !== req.decoded.email){
        return res.status(403).send({message: 'forbidden access'})
      }

      const query = {email: email};
      const user = await userCollection.findOne(query);
      let block = false;
      if(user){
        block = user?.role === 'block';
      }
      res.send({ block });

    })

    app.get('/users', verifytoken,verifyAdmin, async (req, res) => {
      console.log(req.headers);
      const result = await userCollection.find().toArray();
      res.send(result)
    })
    app.get('/ulserAll',async (req, res) => {
      console.log(req.headers);
      const result = await userCollection.find().toArray();
      res.send(result)
    })
    app.post('/users', async (req, res) => {
      const user = req.body;
      // insert email if user doesnt exists:
      // you can do this many ways(1.email unique, 2.upsert, 3.sumple cheking)
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result)
    })

    // admin ar jonno
    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })
    // cretor ar jonno
    app.patch('/users/creator/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          role: 'creator'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })
    // block ar jonno
    app.patch('/users/block/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          role: 'block'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })


    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await userCollection.deleteOne(query);
      res.send(result)
    })
 

    // creators api start----------------------------------------------------
    app.post('/creator', async (req, res) => {
      const contestItem = req.body;
      const result = await createCollection.insertOne(contestItem);
      res.send(result)
    })
    app.get('/creator', async (req, res) => {
      const cursor = createCollection.find();
      const result = await cursor.toArray();
      res.send(result)
    })

    app.get('/creator/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await createCollection.findOne(query)
      res.send(result)
    })

    app.patch('/creatorup/:id', async(req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updatedDoc = {
        $set: { 
          name:item.name,
          contestType:item.contestType, 
          price:item.price, 
          priceMoney:item.priceMoney, 
          description:item.description, 
          date:item.date, 
          taskInstruction:item.taskInstruction,
          image:item.image,

        }
      }
      const result = await createCollection.updateOne(filter, updatedDoc);
      res.send(result)
    })

    app.get('/creatorone/:email', async(req, res) => {
      console.log(req.params.email);
      const result =await createCollection.find({email:req.params.email}).toArray();
      res.send(result)
    })

    app.delete('/creator/:id', async(req,res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await createCollection.deleteOne(query);
      res.send(result)
    })

   


    app.patch('/creator/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          status: 'confirm'
        }
      }
      const result = await createCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });
    app.get('/creatorcreator', async (req, res) => {
      const cursor = createCollection.find();
      const result = await cursor.toArray();
      res.send(result)
    })

   
    
    // sudu staus data get
    app.get('/creatorpublished', async (req, res) => {
      
      const status = req.query.status;
      console.log('status==', status);
      
      const query = {};
      if (status) {
          query.status = 'confirm';
      }
      const result = await createCollection.find(query).toArray();
      res.send(result)
    })

    app.get('/creatsearch', async (req, res) => {
      const filter = req.query;
      console.log('banner', filter);
      const query = {
        contestType: { $regex: filter.search, $options: 'i' }
      }

      const cursor = createCollection.find(query);
      const result = await cursor.toArray();
      res.send(result)
    })
  
    // creators api end----------------------------------------------------
     // payment realted api
     app.post('/create-payment-intent', async (req, res) => {
      const {price} = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, 'amount insite the intent');
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: [ 'card' ]
      });
      res.send({
        // clientSecret: paymentIntent.client_secrete
        clientSecret: paymentIntent.client_secret,
      })

    });


    app.post('/payments', async(req, res) => {
      const payment = req.body;
      const result = await paymentCollection.insertOne(payment);
      // console.log(result);
      res.send(result)
    })
  
    app.get('/payments', async (req, res) => {
      const cursor = paymentCollection.find();
      const result = await cursor.toArray();
      res.send(result)
    })
    app.get('/payments/:contestId', async (req, res) => {
      console.log(req.params.contestId);
      const result = await paymentCollection.find({ contestId: req.params.contestId }).toArray();
      res.send(result)
    })
    app.get('/pay/:email', async (req, res) => {
      console.log(req.params.email);
      const result = await paymentCollection.find({ email: req.params.email }).toArray();
      res.send(result)
    })

    app.patch('/pay/winner/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          status: 'winner'
        }
      }
      const result = await paymentCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })
    
    
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('ContestHub started')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

// user: ContestHub
// pass: lqOt7FnhfRARe9oG


// /search/hello
// /search/:text
// Md Sana ullah
// 12:58 PM
// https://themeforest.net/item/shooter-html5-responsive-photography-and-photo-contest-template/20066124