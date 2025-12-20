import mongoose from "mongoose";

const ngoApplicationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    bloodGroup: { type: String, required: true },
    joiningDate: { type: String, required: true },

    photoUrl: { type: String, required: true },
    ngoId: { type: String, unique: true, required: true },

    imageUrl: { type: String },
    status: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

ngoApplicationSchema.index({ email: 1 });

export default mongoose.model("NgoApplication", ngoApplicationSchema);