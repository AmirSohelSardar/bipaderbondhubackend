import express from "express";
import multer from "multer";
import {
  applyForId,
  checkApplication,
  getAllApplications,
  adminLogin,
  deleteApplication,
  getSingleApplication,
  downloadImage, // ✅ CHANGED: downloadImage instead of downloadPDF
} from "../controllers/Identity.controller.js";

const router = express.Router();

// Multer setup for image upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

/**
 * PUBLIC ROUTES - No authentication needed
 */

// Apply for ID card
router.post("/apply", applyForId);

// Check application status by email
router.get("/check/:email", checkApplication);

// ✅ CHANGED: Download ID card image (returns direct Cloudinary URL)
router.get("/download/:id", downloadImage);

/**
 * ADMIN ROUTES - Simple password-based authentication
 */

// Admin login
router.post("/admin/login", adminLogin);

// Get all applications (admin only)
router.get("/admin/applications", getAllApplications);

// Delete application (admin only)
router.delete("/admin/application/:id", deleteApplication);

// Get single application (admin only)
router.get("/admin/application/:id", getSingleApplication);

export default router;