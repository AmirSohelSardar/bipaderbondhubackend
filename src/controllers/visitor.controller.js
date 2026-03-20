import Visitor from '../models/visitor.model.js';

export const trackVisitor = async (req, res) => {
  try {
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0] ||
      req.socket.remoteAddress;

    const userAgent = req.headers['user-agent'];

    let visitor = await Visitor.findOne({ ip, userAgent });

    if (visitor) {
      visitor.visits += 1;
      await visitor.save();
    } else {
      await Visitor.create({ ip, userAgent });
    }

    const totalVisits = await Visitor.aggregate([
      { $group: { _id: null, total: { $sum: '$visits' } } },
    ]);

    const uniqueVisitors = await Visitor.countDocuments();

    res.json({
      totalVisits: totalVisits[0]?.total || 0,
      uniqueVisitors,
    });
  } catch (error) {
  res.status(200).json({ totalVisits: 0, uniqueVisitors: 0 });
}
};
