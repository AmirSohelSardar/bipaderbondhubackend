import express from "express";
import multer from "multer";
import {
  applyForId,
  checkApplication,
  getAllApplications,
  adminLogin,
  deleteApplication,
  getSingleApplication,
  downloadImage,
  verifyApplication,
  rejectApplication,
} from "../controllers/Identity.controller.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// PUBLIC ROUTES
router.post("/apply", applyForId);
router.get("/check/:email", checkApplication);
router.get("/download/:id", downloadImage);

// ADMIN ROUTES
router.post("/admin/login", adminLogin);
router.get("/admin/applications", getAllApplications);
router.delete("/admin/application/:id", deleteApplication);
router.get("/admin/application/:id", getSingleApplication);
router.put("/admin/application/:id/verify", verifyApplication);
router.put("/admin/application/:id/reject", rejectApplication);

export default router;