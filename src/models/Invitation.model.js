// server/models/Invitation.model.js
import mongoose from "mongoose";

const invitationSchema = new mongoose.Schema(
  {
    name:          { type: String, required: true, trim: true },
    address:       { type: String, default: "" },
    whatsapp:      { type: String, required: true },
    eventName:     { type: String, required: true },
    eventDate:     { type: Date },
    eventLocation: { type: String, required: true },
    inviteLink:    { type: String, default: "" },
    imageUrl:      { type: String, default: "" },  // Cloudinary PNG URL
    waLink:        { type: String, default: "" },   // wa.me link
  },
  { timestamps: true }
);

export default mongoose.model("Invitation", invitationSchema);