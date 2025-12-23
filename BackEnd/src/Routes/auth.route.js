import express from "express"
import { checkuser, Login, Logout, Signup, updateProfile, updateFcmToken, deleteUser, verifyEmail } from "../Controllers/auth.Ctl.js"
import { checkRole, proctedRoute } from "../Config/auth.middlawear.js"
const route = express.Router()

route.post('/signup', Signup)
route.post('/login', Login)
route.get('/verify-email', verifyEmail)

route.get('/logout', Logout)

route.put('/update-profile', proctedRoute, updateProfile)
route.put('/update-fcm-token', proctedRoute, updateFcmToken)
route.get('/check', proctedRoute, checkuser)
route.delete('/delete/:id', proctedRoute, deleteUser)


export default route;
