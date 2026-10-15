require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User"); // Adjust if your path is different

const setupAdmin = async () => {
  try {
    const dbURI = process.env.MONGODB_URI || process.env.MONGO_URI;

    if (!dbURI) {
      throw new Error("MongoDB URI is missing in .env file");
    }

    await mongoose.connect(dbURI);
    console.log("✅ Connected to MongoDB");

    const adminEmail = "admin1@myparcelpoint.com";
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log("⚠️ Admin account already exists!");
      process.exit(0);
    }

    // Hash the password securely
    const plainTextPassword = "Admin@1234";
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainTextPassword, salt);

    // Generate a random 10-digit phone number to bypass the MongoDB duplicate key error
    const randomPhone = `99999${Math.floor(10000 + Math.random() * 90000)}`;

    // Create the Admin User based strictly on your schema
    const adminUser = new User({
      name: "Admin",
      email: adminEmail,
      password: hashedPassword,
      phone: randomPhone,
      role: "ADMIN",

      // Auto-approve the admin so they don't get stuck on KYC/Verification screens
      isApproved: true,
      emailVerified: true,
      phoneVerified: true,
      kycStatus: "APPROVED",
      isActive: true,

      companyName: "MyParcelPoint Admin",
    });

    await adminUser.save();
    console.log("🎉 Admin account created successfully!");
    console.log(`➡️  Email: ${adminEmail}`);
    console.log(`➡️  Password: ${plainTextPassword}`);
    console.log(`➡️  Phone: ${randomPhone} (Used to bypass duplicate error)`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating admin:", error);
    process.exit(1);
  }
};

setupAdmin();
