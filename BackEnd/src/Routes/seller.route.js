import express from 'express'
import { addseller , getSeller } from '../Controllers/seller.Ctl.js'
import  { proctedRoute } from '../Config/auth.middlawear.js'
 const route = express.Router()

 route.post('/addseller' , proctedRoute , addseller)
 route.get("/getseller" , proctedRoute , getSeller)

export default route;