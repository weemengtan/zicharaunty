'use strict'
// Require express and body-parser
const express = require("express")
const bodyParser = require("body-parser")
const moment = require('moment')

// Initialize express and define a port
const app = express()
const PORT = process.env.PORT

// Tell express to use body-parser's JSON parsing
app.use(bodyParser.json())

app.get("/", (req, res) => {
    res.send("Hello from Order Item Webhook")
})

app.post("/orderitem-hook", (req, res) => {
    const intent = req.body.queryResult.intent.displayName
    const parameters = req.body.queryResult.parameters
    const sessionId = req.body.session.split("/").reverse()[0]; // or agent.session
    const mongodb = require('mongodb')
    const MongoClient = mongodb.MongoClient
    const connectionURL = process.env.MONGODB_URL
    const databaseName = 'zichar-aunty-orderitems'
    const collectName = 'order.item'

    var responsetext
    var Greetings_time = "good night"
    var Meals_type

    const breakfastStartTime = moment('6:01 AM', 'h:mma')
    const breakfastEndTime = moment('11:00 AM', 'h:mma')

    const lunchStartTime = moment('11:01 AM', 'h:mma')
    const lunchEndTime = moment('2:00 PM', 'h:mma')

    const teaStartTime = moment('2:01 PM', 'h:mma')
    const teaEndTime = moment('5:00 PM', 'h:mma')

    const dinnerStartTime = moment('5:01 PM', 'h:mma')
    const dinnerEndTime = moment('9:00 PM', 'h:mma')

    const supperStartTime = moment('9:01 PM', 'h:mma')
    const supperEndTime = moment('12:00 AM', 'h:mma')

    if (moment().isBetween(breakfastStartTime, breakfastEndTime)) {
        Meals_type = 'breakfast'
    } else if (moment().isBetween(lunchStartTime, lunchEndTime)) {
        Meals_type = 'lunch'
    } else if (moment().isBetween(teaStartTime, teaEndTime)) {
        Meals_type = 'teabreak'
    } else if (moment().isBetween(dinnerStartTime, dinnerEndTime)) {
        Meals_type = 'dinner'
    } else if (moment().isBetween(supperStartTime, supperEndTime)) {
        Meals_type = 'supper'
    }

    switch (intent) {
        case "Default Welcome Intent":

            const morningStartTime = moment('12:01 AM', 'h:mma')
            const afternoonStartTime = moment('12:01 PM', 'h:mma')
            const eveningStartTime = moment('5:01 PM', 'h:mma')

            if (moment().isBetween(morningStartTime, afternoonStartTime)) {
                Greetings_time = 'good morning'
            } else if (moment().isBetween(afternoonStartTime, eveningStartTime)) {
                Greetings_time = 'good afternoon'
            } else Greetings_time = 'great evening'


            responsetext = `Hey ${Greetings_time}! What you want to eat for ${Meals_type}? But aunty very slow one ar, so order 1 item at a time hor thanks!`
            res.json({
                speech: responsetext,
                fulfillmentText: responsetext,
                source: 'zichar-aunty-webhook'
            })
            res.status(200).end() // Responding is important
            break;
        case "Order.Dishes.Item.Completed":
            var orderItemLists

            MongoClient.connect(connectionURL, { useUnifiedTopology: true }, (error, client) => {
                if (error) {
                    return console.log('unable to connect to database server');
                }
                const db = client.db(databaseName)
                    //check if the dishes item already exist first
                db.collection(collectName).find({
                    sessionId
                }).toArray().then((result) => {
                    const totalOrderItems = result.length
                    if (totalOrderItems > 1) {
                        orderItemLists = `You ordered ${totalOrderItems} dishes for ${Meals_type} today which are `
                    } else if (totalOrderItems === 1) {
                        orderItemLists = `You ordered ${totalOrderItems} dish for ${Meals_type} today which is `
                    }
                    result.forEach((i, idx, array) => {
                        if (idx === (array.length - 1)) {
                            orderItemLists += `${i.dishes_qty} ${i.dishes_size} size ${i.dishes_type}.`
                        } else if (idx === (array.length - 2)) {
                            orderItemLists += `${i.dishes_qty} ${i.dishes_size} size ${i.dishes_type} and `
                        } else {
                            orderItemLists += `${i.dishes_qty} ${i.dishes_size} size ${i.dishes_type}, `
                        }
                    })
                    responsetext = orderItemLists + ' Can double confirm?'
                    res.json({
                        speech: responsetext,
                        fulfillmentText: responsetext,
                        source: 'zichar-aunty-webhook'
                    })
                    res.status(200).end() // Responding is important
                }).catch((error) => {
                    console.log(`Unable to order item collection`, error)
                })
            })
            break;
        case "Order.Dishes.Item":
        case "Order.Dishes.Item.Add":
            MongoClient.connect(connectionURL, { useUnifiedTopology: true }, (error, client) => {
                if (error) {
                    return console.log('Unable to connect to database server');
                }
                const db = client.db(databaseName)
                    //check if the dishes item already exist first
                db.collection(collectName).findOne({
                    sessionId,
                    dishes_type: parameters.dishes_type,
                    dishes_size: parameters.dishes_size
                }).then((result) => {
                    if (result === null) {
                        //add new item
                        db.collection(collectName).insertOne({
                            sessionId,
                            dishes_type: parameters.dishes_type,
                            dishes_size: parameters.dishes_size,
                            dishes_qty: Number(parameters.dishes_qty)
                        }).then((result) => {
                            console.log('Successfully inserted order item.')
                        }).catch((error) => {
                            console.log(`Unable to add order item.`)
                        })
                    } else {
                        db.collection(collectName).updateOne({
                                sessionId,
                                dishes_type: parameters.dishes_type,
                                dishes_size: parameters.dishes_size
                            }, { $inc: { dishes_qty: Number(parameters.dishes_qty) } })
                            .then((result) => { console.log('Updated order qty.') })
                            .catch((error) => { console.log('Unable to update item quantity.', error) })
                    }
                }).catch((error) => {
                    console.log(`Unable to order item collection`, error)
                })
            })
            break;

        default:
            break;
    }
})

// Start express on the defined port
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`))