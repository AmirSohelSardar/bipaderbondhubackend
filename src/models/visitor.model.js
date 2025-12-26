import mongoose from 'mongoose';

const visitorSchema = new mongoose.Schema(
  {
    ip: { type: String, required: true },
    userAgent: { type: String },
    visits: { type: Number, default: 1 },
  },
  { timestamps: true }
);

visitorSchema.index({ ip: 1, userAgent: 1 }, { unique: true });

const Visitor = mongoose.model('Visitor', visitorSchema);
export default Visitor;
