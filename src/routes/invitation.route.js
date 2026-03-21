// // server/routes/invitation.route.js
// import express from "express";
// import Invitation from "../models/Invitation.model.js";

// const router = express.Router();

// // GET all
// router.get("/", async (req, res) => {
//   try {
//     const data = await Invitation.find().sort({ createdAt: -1 });
//     res.json({ success: true, data });
//   } catch (e) {
//     res.status(500).json({ success: false, message: e.message });
//   }
// });

// // POST create
// router.post("/", async (req, res) => {
//   try {
//     const inv = await Invitation.create(req.body);
//     res.status(201).json({ success: true, data: inv });
//   } catch (e) {
//     res.status(400).json({ success: false, message: e.message });
//   }
// });

// // DELETE
// router.delete("/:id", async (req, res) => {
//   try {
//     await Invitation.findByIdAndDelete(req.params.id);
//     res.json({ success: true });
//   } catch (e) {
//     res.status(500).json({ success: false, message: e.message });
//   }
// });

// export default router;