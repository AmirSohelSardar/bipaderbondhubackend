import NgoApplication from "../models/ngoApplication.model.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../config/cloudinary.js";
import puppeteer from "puppeteer";

/**
 * Generate Professional PVC ID Card HTML (FIXED LAYOUT)
 * Standard PVC Card Size: 85.6mm x 54mm (3.375" x 2.125")
 * Scaled to 1200x758px for high quality print
 */
const generateIdCardHTML = (data) => {
  const { name, address, phone, bloodGroup, joiningDate, ngoId, photoUrl } = data;
  
  // Calculate validity year (5 years from joining)
  const joinYear = new Date(joiningDate).getFullYear();
  const validYear = joinYear + 5;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      width: 1200px;
      height: 758px;
      font-family: 'Arial', sans-serif;
      background: #f5f5f5;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    
    .id-card {
      width: 1200px;
      height: 758px;
      background: linear-gradient(135deg, #2563eb 0%, #4f46e5 50%, #6366f1 100%);
      border-radius: 35px;
      overflow: hidden;
      position: relative;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    }
    
    .card-header {
      background: linear-gradient(90deg, #e5e7eb 0%, #f3f4f6 100%);
      padding: 20px 35px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 8px solid #f59e0b;
      height: 140px;
    }
    
    .org-info {
      display: flex;
      align-items: center;
      gap: 20px;
      flex: 1;
    }
    
    .org-logo {
      width: 100px;
      height: 100px;
      background: white;
      border-radius: 50%;
      border: 5px solid #dc2626;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      color: #dc2626;
      font-size: 28px;
      flex-shrink: 0;
      overflow: hidden;
    }

    .org-logo img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      padding: 8px;
    }
    
    .org-name {
      flex: 1;
    }
    
    .org-name h1 {
      font-size: 36px;
      font-weight: bold;
      color: #2563eb;
      line-height: 1.2;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .org-name p {
      font-size: 18px;
      color: #6b7280;
      font-style: italic;
      margin-top: 3px;
    }
    
    .member-badge {
      background: linear-gradient(135deg, #ea580c, #dc2626);
      color: white;
      padding: 12px 28px;
      border-radius: 35px;
      font-size: 24px;
      font-weight: bold;
      text-align: center;
      line-height: 1.3;
      flex-shrink: 0;
    }
    
    .card-body {
      display: flex;
      padding: 30px 35px 15px 35px;
      gap: 30px;
      color: white;
      height: calc(758px - 140px - 50px);
    }
    
    .photo-section {
      flex-shrink: 0;
    }
    
    .member-photo {
      width: 240px;
      height: 300px;
      object-fit: cover;
      border-radius: 20px;
      border: 6px solid white;
      box-shadow: 0 5px 20px rgba(0,0,0,0.3);
    }
    
    .info-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-right: 10px;
    }
    
    .member-name {
      font-size: 42px;
      font-weight: bold;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      line-height: 1.1;
    }
    
    .info-item {
      background: rgba(255, 255, 255, 0.15);
      padding: 12px 20px;
      border-radius: 15px;
      display: flex;
      align-items: center;
      gap: 15px;
      font-size: 26px;
    }
    
    .info-label {
      color: #fbbf24;
      font-weight: bold;
      min-width: 120px;
    }
    
    .info-value {
      color: white;
      font-weight: 600;
    }
    
    .right-section {
      display: flex;
      flex-direction: column;
      gap: 18px;
      align-items: center;
      flex-shrink: 0;
    }
    
    .unique-id-box {
      background: linear-gradient(135deg, #fef3c7, #fde68a);
      border: 5px solid #f59e0b;
      border-radius: 20px;
      padding: 15px 28px;
      text-align: center;
      box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    }
    
    .unique-id-label {
      font-size: 16px;
      color: #78716c;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .unique-id-value {
      font-size: 28px;
      color: #2563eb;
      font-weight: bold;
      margin-top: 5px;
      letter-spacing: 0.5px;
    }
    
    .qr-section {
      background: white;
      padding: 15px;
      border-radius: 20px;
      box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    }
    
    .qr-code {
      width: 180px;
      height: 180px;
      display: block;
    }
    
    .validity-badge {
      background: linear-gradient(135deg, #fbbf24, #f59e0b);
      color: #1e40af;
      padding: 10px 25px;
      border-radius: 25px;
      font-size: 20px;
      font-weight: bold;
      text-align: center;
    }
    
    .footer {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 18px;
      color: rgba(255, 255, 255, 0.9);
      background: rgba(0, 0, 0, 0.1);
      padding: 8px 0;
      border-top: 2px solid rgba(255, 255, 255, 0.2);
    }
  </style>
</head>
<body>
  <div class="id-card">
    <div class="card-header">
      <div class="org-info">
        <div class="org-logo">
          <img 
            src="https://bipaderbondhubackend-server.vercel.app/public/logo.png" 
            alt="NPBB"
            onerror="this.style.display='none'; this.parentElement.innerHTML='NPBB';"
            crossorigin="anonymous"
          />
        </div>
        <div class="org-name">
          <h1>NARAYAN PUR BIPADER BONDHU</h1>
          <p>Serving Humanity with Dedication</p>
        </div>
      </div>
      <div class="member-badge">
        MEMBER<br>ID
      </div>
    </div>
    
    <div class="card-body">
      <div class="photo-section">
        <img class="member-photo" src="${photoUrl}" alt="Member Photo" crossorigin="anonymous" />
      </div>
      
      <div class="info-section">
        <div class="member-name">${name}</div>
        
        <div class="info-item">
          <span class="info-label">Address:</span>
          <span class="info-value">${address}</span>
        </div>
        
        <div class="info-item">
          <span class="info-label">Phone:</span>
          <span class="info-value">${phone}</span>
        </div>
        
        <div class="info-item">
          <span class="info-label">Blood:</span>
          <span class="info-value">${bloodGroup}</span>
        </div>
        
        <div class="info-item">
          <span class="info-label">Joined:</span>
          <span class="info-value">${joiningDate}</span>
        </div>
      </div>
      
      <div class="right-section">
        <div class="unique-id-box">
          <div class="unique-id-label">UNIQUE ID</div>
          <div class="unique-id-value">${ngoId}</div>
        </div>
        
        <div class="qr-section">
          <img class="qr-code" src="https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${ngoId}" alt="QR" crossorigin="anonymous" />
        </div>
        
        <div class="validity-badge">
          Valid Till ${validYear}
        </div>
      </div>
    </div>
    
    <div class="footer">
      narayanpurbipaderbondhu@gmail.com
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * ✅ FIXED: Generate IMAGE from HTML using Puppeteer (NOT PDF)
 */
const generateImageFromHTML = async (html) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Set viewport to match card size (PVC card ratio scaled up for quality)
    await page.setViewport({
      width: 1200,
      height: 758,
      deviceScaleFactor: 2 // High quality
    });
    
    await page.setContent(html, {
      waitUntil: 'networkidle0'
    });

    // ✅ TAKE SCREENSHOT INSTEAD OF PDF
    const imageBuffer = await page.screenshot({
      type: 'png',
      fullPage: false
    });

    await browser.close();
    return imageBuffer;

  } catch (error) {
    if (browser) await browser.close();
    throw error;
  }
};

/**
 * USER APPLY FOR ID CARD
 * POST /api/identity/apply
 */
export const applyForId = async (req, res) => {
  try {
    const {
      name,
      address,
      phone,
      email,
      bloodGroup,
      joiningDate,
      photoBase64,
    } = req.body;

    // Validate input
    if (!name || !address || !phone || !email || !bloodGroup || !joiningDate || !photoBase64) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Sanitize and validate email
    const sanitizedEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // Check if user already applied
    const existingApplication = await NgoApplication.findOne({ email: sanitizedEmail });
    if (existingApplication) {
      return res.status(200).json({
        success: true,
        message: "Application already exists",
        ngoId: existingApplication.ngoId,
        imageUrl: existingApplication.imageUrl,
        application: existingApplication,
        alreadyExists: true,
      });
    }

    // Generate unique NGO ID
    const year = new Date().getFullYear();
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const ngoId = `NGO-${randomNum.toString().substring(0, 6)}-${year.toString().substring(2)}`;

    console.log("📤 Uploading photo to Cloudinary...");
    const photoBuffer = Buffer.from(photoBase64.split(",")[1], "base64");
    const photoUpload = await uploadToCloudinary(photoBuffer, "ngo-id-photos", ngoId);

    console.log("🎨 Generating ID Card HTML...");
    const idCardHtml = generateIdCardHTML({
      name,
      address,
      phone,
      bloodGroup,
      joiningDate,
      ngoId,
      photoUrl: photoUpload.secure_url,
    });

    console.log("📸 Converting HTML to Image...");
    const imageBuffer = await generateImageFromHTML(idCardHtml);

    console.log("📤 Uploading ID Card Image to Cloudinary...");
    const imageUpload = await uploadToCloudinary(
      imageBuffer,
      "ngo-id-cards",
      `${ngoId}-card`,
      "image"
    );

    // Save to database
    const application = await NgoApplication.create({
      name,
      address,
      phone,
      email: sanitizedEmail,
      bloodGroup,
      joiningDate,
      photoUrl: photoUpload.secure_url,
      ngoId,
      imageUrl: imageUpload.secure_url,
      status: "approved",
    });

    console.log("✅ Application created successfully:", ngoId);

    res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      ngoId: application.ngoId,
      imageUrl: application.imageUrl,
      application,
      alreadyExists: false,
    });

  } catch (error) {
    console.error("❌ Application error:", error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Email or NGO ID already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error: " + error.message,
    });
  }
};

/**
 * CHECK APPLICATION BY EMAIL
 * GET /api/identity/check/:email
 */
export const checkApplication = async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const sanitizedEmail = email.toLowerCase().trim();
    
    const application = await NgoApplication.findOne({ email: sanitizedEmail });
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: "No application found for this email",
      });
    }

    res.status(200).json({
      success: true,
      application,
    });
  } catch (error) {
    console.error("❌ Check application error:", error);
    res.status(500).json({
      success: false,
      message: "Server error: " + error.message,
    });
  }
};

/**
 * ✅ FIXED: Download ID Card Image (Direct Cloudinary URL - Always works)
 * GET /api/identity/download/:id
 */
export const downloadImage = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("📥 Download request for application ID:", id);

    const application = await NgoApplication.findById(id);

    if (!application) {
      console.error("❌ Application not found:", id);
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    if (!application.imageUrl) {
      console.error("❌ No image URL in application:", id);
      return res.status(404).json({
        success: false,
        message: "ID card image not available for this application",
      });
    }

    console.log("✅ Returning image URL:", application.imageUrl);

    // Return the direct Cloudinary image URL - frontend will handle download
    res.status(200).json({
      success: true,
      imageUrl: application.imageUrl,
      ngoId: application.ngoId,
      name: application.name,
    });

  } catch (error) {
    console.error("❌ Download error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get image: " + error.message,
    });
  }
};

/**
 * ADMIN LOGIN
 * POST /api/identity/admin/login
 */
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const ADMIN_EMAIL = "narayanpurbipaderbondhu@gmail.com";
    const ADMIN_PASSWORD = "Kada@#2000";

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      return res.status(200).json({
        success: true,
        message: "Admin login successful",
        token: "admin_authenticated",
      });
    }

    res.status(401).json({
      success: false,
      message: "Invalid admin credentials",
    });
  } catch (error) {
    console.error("❌ Admin login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * GET ALL APPLICATIONS (Admin)
 * GET /api/identity/admin/applications
 */
export const getAllApplications = async (req, res) => {
  try {
    const adminToken = req.headers.authorization;
    
    if (adminToken !== "Bearer admin_authenticated") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const applications = await NgoApplication.find()
      .sort({ createdAt: -1 })
      .select("-__v");

    res.status(200).json({
      success: true,
      count: applications.length,
      applications,
    });
  } catch (error) {
    console.error("❌ Get applications error:", error);
    res.status(500).json({
      success: false,
      message: "Server error: " + error.message,
    });
  }
};

/**
 * DELETE APPLICATION (Admin) - WITH CLOUDINARY CLEANUP
 * DELETE /api/identity/admin/application/:id
 */
export const deleteApplication = async (req, res) => {
  try {
    const adminToken = req.headers.authorization;
    
    if (adminToken !== "Bearer admin_authenticated") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { id } = req.params;
    
    const application = await NgoApplication.findById(id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    // Delete from Cloudinary
    console.log("🗑️ Deleting files from Cloudinary...");
    
    if (application.photoUrl) {
      await deleteFromCloudinary(application.photoUrl);
    }
    
    if (application.imageUrl) {
      await deleteFromCloudinary(application.imageUrl);
    }

    // Delete from database
    await NgoApplication.findByIdAndDelete(id);

    console.log("✅ Application and files deleted successfully");

    res.status(200).json({
      success: true,
      message: "Application deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete application error:", error);
    res.status(500).json({
      success: false,
      message: "Server error: " + error.message,
    });
  }
};

/**
 * GET SINGLE APPLICATION (Admin)
 * GET /api/identity/admin/application/:id
 */
export const getSingleApplication = async (req, res) => {
  try {
    const adminToken = req.headers.authorization;

    if (adminToken !== "Bearer admin_authenticated") {
      return res.status(403).json({ 
        success: false,
        message: "Unauthorized" 
      });
    }

    const { id } = req.params;

    const application = await NgoApplication.findById(id);

    if (!application) {
      return res.status(404).json({ 
        success: false,
        message: "Application not found" 
      });
    }

    res.status(200).json({
      success: true,
      application: {
        imageUrl: application.imageUrl,
        name: application.name,
        ngoId: application.ngoId,
      },
    });
  } catch (error) {
    console.error("❌ Get single application error:", error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};