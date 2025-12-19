import mongoose from "mongoose";

const ngoApplicationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    bloodGroup: { type: String, required: true },
    joiningDate: { type: String, required: true },

    photoUrl: { type: String, required: true }, // Cloudinary URL
    ngoId: { type: String, unique: true, required: true },

    imageUrl: { type: String }, // ✅ CHANGED: Generated ID card image URL (NOT PDF)
    status: {
      type: String,
      enum: ["pending", "approved"],
      default: "approved",
    },
  },
  { timestamps: true }
);

// Index for faster email lookups
ngoApplicationSchema.index({ email: 1 });

export default mongoose.model("NgoApplication", ngoApplicationSchema);