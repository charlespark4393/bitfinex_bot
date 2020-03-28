const CryptoJS = require('crypto-js');
const request = require('request');
const axios = require('axios')
const config = require('./config');
const apiKey = config.apiKey
const apiSecret = config.apiSecret
const symbol = config.symbol
const loop_time = config.loop_time
const trade_amount = config.trade_amount
const repeat_order_1 = config.repeat_order_1
const repeat_order_2 = config.repeat_order_2
const spread_1 = config.spread_1
const spread_2 = config.spread_2
const decimal_point = config.decimal_point


function GetBalance() {
  return new Promise ((resolve, reject) => {
    const nonce = (Date.now() * 1000).toString()
    const body = {
    }
    const apiPath = 'v2/auth/r/wallets'
    let signature = `/api/${apiPath}${nonce}${JSON.stringify(body)}`
    const sig = CryptoJS.HmacSHA384(signature, apiSecret).toString() 
    const options = {
      url: `https://api.bitfinex.com/${apiPath}`,
      headers: {
        'bfx-nonce': nonce,
        'bfx-apikey': apiKey,
        'bfx-signature': sig
      },
      body: body,
      json: true
    }
    request.post(options, (error, response, body) => {
      if (error) {
        reject({
          success: 0,
          message: error
        })
      } else {
        if (body[0] == 'error') {
          reject({
            success: 0,
            message: body
          })
        } else {
          resolve({
            success: 1,
            balance: body
          })
        }
      }
    })
  })
}

function GetCurrentTicker() {
  return new Promise ((resolve, reject) => {
    axios.get(`https://api-pub.bitfinex.com/v2/ticker/${symbol}`)
    .then((res) => {
      resolve(res)
    }).catch((error) => {
      reject(error)
    })
  })
}

function CancelOrders(key, order_id) {
  console.log(`Cancelling ${key} Order`, order_id)
  return new Promise ((resolve, reject) => {
    const nonce = (Date.now() * 1000).toString()
    const body = {
      id: order_id
    }
    const apiPath = `v2/auth/w/order/cancel`
    let signature = `/api/${apiPath}${nonce}${JSON.stringify(body)}`
    const sig = CryptoJS.HmacSHA384(signature, apiSecret).toString() 
    const options = {
      url: `https://api.bitfinex.com/${apiPath}`,
      headers: {
        'bfx-nonce': nonce,
        'bfx-apikey': apiKey,
        'bfx-signature': sig
      },
      body: body,
      json: true
    }
    request.post(options, (error, response, body) => {
      if (error) {
        console.log("Unexpected Error when cancell this order", error)
        reject({
          success: 0,
          message: error
        })
      } else {
        if (body[0] == 'error') {
          console.log("Unexpected Error when cancell this order", error)
          reject({
            success: 0,
            message: body
          })
        } else {
          console.log("Successfully cancelled this order")
          resolve({
            success: 1,
            orders: body
          })
        }
      }
    })
  })
}

function GetOrders() {
  return new Promise ((resolve, reject) => {
    const nonce = (Date.now() * 1000).toString()
    const body = {
    }
    const apiPath = `v2/auth/r/orders`
    let signature = `/api/${apiPath}${nonce}${JSON.stringify(body)}`
    const sig = CryptoJS.HmacSHA384(signature, apiSecret).toString() 
    const options = {
      url: `https://api.bitfinex.com/${apiPath}`,
      headers: {
        'bfx-nonce': nonce,
        'bfx-apikey': apiKey,
        'bfx-signature': sig
      },
      body: body,
      json: true
    }
    request.post(options, (error, response, body) => {
      if (error) {
        reject({
          success: 0,
          message: error
        })
      } else {
        if (body[0] == 'error') {
          reject({
            success: 0,
            message: body
          })
        } else {
          resolve({
            success: 1,
            orders: body
          })
        }
      }
    })
  })
}

function MakeOrder(amount, order_price, type, round) {
  order_price = order_price.toFixed(decimal_point)
  round += 1
  if (amount > 0) 
    console.log(`Making Sell Order ${type} repeat number ${round} Order Price(${order_price})`)
  else 
    console.log(`Making Buy Order ${type} repeat number ${round} Order Price(${order_price})`)
  
  return new Promise ((resolve, reject) => {
    const nonce = (Date.now() * 1000).toString()
    const body = {
      type: 'LIMIT',
      symbol: symbol,
      price: order_price.toString(),
      amount: amount.toString(),
    }
    const apiPath = 'v2/auth/w/order/submit'
    let signature = `/api/${apiPath}${nonce}${JSON.stringify(body)}`
    const sig = CryptoJS.HmacSHA384(signature, apiSecret).toString() 
    const options = {
      url: `https://api.bitfinex.com/${apiPath}`,
      headers: {
        'bfx-nonce': nonce,
        'bfx-apikey': apiKey,
        'bfx-signature': sig
      },
      body: body,
      json: true
    }
    request.post(options, (error, response, body) => {
      if (error) {
        console.log('Error when Make Order Option', error)
        reject({
          success: 0,
          message: error
        })
      } else {
        if (body[0] == 'error') {
          console.log('Error when Make Order Response', body)
          reject({
            success: 0,
            message: body
          })
        } else {
          console.log('Successfully Made Order')
          resolve({
            success: 1,
            result: body
          })
        }
      }
    })
  })
}

function StartBot() {
  GetBalance()
  .then((res) => {
    const balances = res.balance
    console.log('Account Balances\n', balances)
    GetCurrentTicker()
    .then(async (res) => {
      const current_ticker_price = res.data[6]
      console.log('Current Ticker Price\n', current_ticker_price)
      console.log('Start Repeat Order 1')
      for (let i = 0 ; i < repeat_order_1 ; i += 1) { 
        const buy_order_price = current_ticker_price * (1 - spread_1)
        const sell_order_price = current_ticker_price * (1 + spread_1)
        await MakeOrder(trade_amount, buy_order_price, 1, i)
        await MakeOrder(-1 * trade_amount, sell_order_price, 1, i)
      }
      console.log('Start Repeat Order 2')
      for (let i = 0 ; i < repeat_order_2 ; i += 1) { 
        const buy_order_price = current_ticker_price * (1 - spread_2)
        const sell_order_price = current_ticker_price * (1 + spread_2)
        await MakeOrder(trade_amount, buy_order_price, 2, i)
        await MakeOrder(-1 * trade_amount, sell_order_price, 2, i)
      }
      GetOrders()
      .then(async (resp) => {
        console.log('Active Orders Length', resp.orders.length)
        let cancel_order_ids = {
          highest_price: -1,
          lowest_price: -1,
          highest_amount: -1,
          lowest_amount: -1,
        }

        let highest_price = -99999
        for (let i = 0 ; i < resp.orders.length ; i += 1) {
          const order = resp.orders[i]
          if (highest_price < order[16]) {
            highest_price = order[16]
            cancel_order_ids['highest_price'] = order[0]
          }
        }

        let lowest_price = 99999
        for (let i = 0 ; i < resp.orders.length ; i += 1) {
          const order = resp.orders[i]
          if (lowest_price > order[16]) {
            lowest_price = order[16]
            cancel_order_ids['lowest_price'] = order[0]
          }
        }

        let highest_amount= -99999
        for (let i = 0 ; i < resp.orders.length ; i += 1) {
          const order = resp.orders[i]
          if (highest_amount < order[6]) {
            highest_amount = order[6]
            cancel_order_ids['highest_amount'] = order[0]
          }
        }

        let lowest_amount = 99999
        for (let i = 0 ; i < resp.orders.length ; i += 1) {
          const order = resp.orders[i]
          if (lowest_amount > order[6]) {
            lowest_amount = order[6]
            cancel_order_ids['lowest_amount'] = order[0]
          }
        }

        let cancelled_ids = []
        for (var key in cancel_order_ids) {
          const order_id = cancel_order_ids[key]   
          if (order_id !== -1) {
              if (cancelled_ids.indexOf(order_id) == -1) {
                cancelled_ids.push(order_id)
                await CancelOrders(key, order_id)
              }
            }
        }
      }).catch((error) => {
        console.log('Error when getting Submitted Orders', error)
      })
    }).catch((error) => {
      console.log('Error when getting Current Ticker Price', error)
    })
  }).catch((error) => {
    console.log('Error when getting Account Balance', error.message)
  })
}

function Interval() {
  let round = 0;
  setInterval(() => {
    round += 1
    console.log('\n\nRound Start', round)
    StartBot()
  }, loop_time * 1000)
}

Interval()

