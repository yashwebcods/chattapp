import express from "express";
import { proctedRoute } from "../Config/auth.middlawear.js";
import { createGroup, getGroups, getGroupMessages, addMemberToGroup, removeMemberFromGroup } from "../Controllers/group.Ctl.js";

const router = express.Router();

router.post("/create", proctedRoute, createGroup);
router.get("/", proctedRoute, getGroups);
router.get("/:groupId", proctedRoute, getGroupMessages);
router.post("/:groupId/add-member", proctedRoute, addMemberToGroup);
router.post("/:groupId/remove-member", proctedRoute, removeMemberFromGroup);

export default router;
