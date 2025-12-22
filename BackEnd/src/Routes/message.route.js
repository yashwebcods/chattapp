import express from 'express'
import { proctedRoute } from '../Config/auth.middlawear.js'
import { getMessage, getUser, sendMessage, deleteMessages, clearChat, clearGroupChat, editMessage, markMessagesAsSeen } from '../Controllers/message.Ctl.js'
const route = express.Router()

route.get('/users', proctedRoute, getUser)
route.get('/:id', proctedRoute, getMessage)
route.post('/send/:id', proctedRoute, sendMessage)
route.post('/seen/:id', proctedRoute, markMessagesAsSeen)
route.post('/delete', proctedRoute, deleteMessages)
route.delete('/clear/:id', proctedRoute, clearChat)
route.delete('/group/:groupId', proctedRoute, clearGroupChat)
route.put('/edit/:id', proctedRoute, editMessage)

export default route;