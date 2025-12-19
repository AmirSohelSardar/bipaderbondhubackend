import { uploadToCloudinary } from "../config/cloudinary.js";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";



/**
 * Generate ID Card PDF and upload to Cloudinary
 * Uses a simple HTML to PDF conversion approach
 */
export const generateIdCardPDF = async (data) => {
  try {
    const { name, phone, bloodGroup, joiningDate, ngoId, photoUrl } = data;

    // Create HTML template for ID card
    const htmlTemplate = `
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
      font-family: Arial, sans-serif;
      background: white;
    }
    
    .id-card {
      width: 600px;
      height: 380px;
      background: linear-gradient(135deg, #1e3c72, #2a5298);
      border-radius: 20px;
      overflow: hidden;
      position: relative;
    }
    
    .card-header {
      background: white;
      color: #1e3c72;
      padding: 15px;
      font-weight: bold;
      text-align: center;
      font-size: 16px;
    }
    
    .card-body {
      display: flex;
      padding: 20px;
      gap: 20px;
      color: white;
    }
    
    .photo-container {
      flex-shrink: 0;
    }
    
    .member-photo {
      width: 120px;
      height: 140px;
      object-fit: cover;
      border-radius: 10px;
      border: 3px solid white;
    }
    
    .info-section {
      flex: 1;
    }
    
    .info-row {
      font-size: 14px;
      margin-bottom: 8px;
      line-height: 1.4;
    }
    
    .info-row strong {
      display: inline-block;
      width: 80px;
    }
    
    .qr-section {
      background: white;
      padding: 10px;
      border-radius: 10px;
      width: 110px;
      height: 110px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .qr-code {
      width: 90px;
      height: 90px;
    }
  </style>
</head>
<body>
  <div class="id-card">
    <div class="card-header">
      Narayan Pur Bipader Bondhu Welfare Society
    </div>
    
    <div class="card-body">
      <div class="photo-container">
        <img class="member-photo" src="${photoUrl}" alt="Member Photo" />
      </div>
      
      <div class="info-section">
        <div class="info-row">
          <strong>Name:</strong> ${name}
        </div>
        <div class="info-row">
          <strong>Phone:</strong> ${phone}
        </div>
        <div class="info-row">
          <strong>Blood:</strong> ${bloodGroup}
        </div>
        <div class="info-row">
          <strong>Joining:</strong> ${joiningDate}
        </div>
        <div class="info-row">
          <strong>ID:</strong> ${ngoId}
        </div>
      </div>
      
      <div class="qr-section">
        <img class="qr-code" src="https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${ngoId}" alt="QR Code" />
      </div>
    </div>
  </div>
</body>
</html>
    `;

    // For now, we'll store the HTML as a PDF placeholder
    // In production, you'd use a service like Puppeteer, PDFKit, or an API
    
  

// Generate real PDF
const browser = await puppeteer.launch({
  args: chromium.args,
  executablePath: await chromium.executablePath(),
  headless: chromium.headless,
});

const page = await browser.newPage();
await page.setBypassCSP(true);

await page.setContent(htmlTemplate, { waitUntil: "load" });

// ✅ wait until images load
await page.waitForSelector("img", { timeout: 5000 });

const pdfBuffer = await page.pdf({
  width: "85.6mm",
  height: "54mm",
  printBackground: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 }
});

await browser.close();

// Upload REAL PDF
const pdfUpload = await uploadToCloudinary(
  pdfBuffer,
  "ngo-id-cards",
  `${ngoId}-card`,   // ❌ NO .pdf here
  "raw"
);

    return pdfUpload.secure_url;
  } catch (error) {
    console.error("❌ PDF generation error:", error);
    throw new Error("Failed to generate PDF: " + error.message);
  }
};

/**
 * Alternative: Generate simple text-based PDF info
 * This creates a JSON file with all info that can be downloaded
 */
export const generateIdCardData = (data) => {
  const { name, phone, bloodGroup, joiningDate, ngoId, photoUrl } = data;
  
  return {
    organizationName: "Narayan Pur Bipader Bondhu Welfare Society",
    memberInfo: {
      name,
      phone,
      bloodGroup,
      joiningDate,
      ngoId,
      photoUrl,
    },
    qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${ngoId}`,
    generatedAt: new Date().toISOString(),
  };
};