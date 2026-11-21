import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const User = mongoose.model("User", new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
}));

const Question = mongoose.model("Question", new mongoose.Schema({
  exam: String,
  subject: String,
  question: String,
  options: [String],
  answer: Number
}));

const Result = mongoose.model("Result", new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  exam: String,
  score: Number,
  total: Number,
  date: { type: Date, default: Date.now }
}));

const sampleQuestions = [
  {
    exam: "TNPSC",
    subject: "General Knowledge",
    question: "What is the capital of Tamil Nadu?",
    options: ["Madurai", "Chennai", "Salem", "Coimbatore"],
    answer: 1
  },
  {
    exam: "TNPSC",
    subject: "History",
    question: "Who was the first President of India?",
    options: ["Nehru", "Rajendra Prasad", "Gandhi", "Patel"],
    answer: 1
  },
  {
    exam: "RRB",
    subject: "Mathematics",
    question: "What is 25% of 200?",
    options: ["25", "40", "50", "100"],
    answer: 2
  },
  {
    exam: "RRB",
    subject: "Science",
    question: "Which planet is called the Red Planet?",
    options: ["Earth", "Venus", "Mars", "Jupiter"],
    answer: 2
  }
];

function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Login required" });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password || password.length < 8) {
      return res.status(400).json({
        message: "Name, email and 8-character password required"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (await User.findOne({ email: normalizedEmail })) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);

    await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashed
    });

    res.status(201).json({ message: "Registration successful" });
  } catch {
    res.status(500).json({ message: "Registration failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ message: "Invalid input" });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase()
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token, name: user.name, email: user.email });
  } catch {
    res.status(500).json({ message: "Login failed" });
  }
});

app.get("/api/questions/:exam", authenticate, async (req, res) => {
  try {
    const exam = req.params.exam.toUpperCase();

    if (!["TNPSC", "RRB"].includes(exam)) {
      return res.status(400).json({ message: "Invalid exam" });
    }

    const questions = await Question.find({ exam }).select("-answer");
    res.json(questions);
  } catch {
    res.status(500).json({ message: "Failed to load questions" });
  }
});

app.post("/api/submit", authenticate, async (req, res) => {
  try {
    const { exam, answers } = req.body;

    if (!["TNPSC", "RRB"].includes(exam) ||
        !answers || typeof answers !== "object" ||
        Array.isArray(answers)) {
      return res.status(400).json({ message: "Invalid submission" });
    }

    const questions = await Question.find({ exam });
    let score = 0;

    questions.forEach(q => {
      if (answers[q.id] === q.answer) score++;
    });

    const result = await Result.create({
      userId: req.user.id,
      exam,
      score,
      total: questions.length
    });

    res.json({
      score: result.score,
      total: result.total,
      message: "Exam submitted successfully"
    });
  } catch {
    res.status(500).json({ message: "Submission failed" });
  }
});

app.get("/api/results", authenticate, async (req, res) => {
  try {
    const results = await Result.find({
      userId: req.user.id
    }).sort({ date: -1 });

    res.json(results);
  } catch {
    res.status(500).json({ message: "Failed to load results" });
  }
});

app.get("/", (req, res) => {
  res.send("TNPSC & RRB Exam Portal API Running");
});

async function start() {
  try {
    if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
      throw new Error("MONGO_URI or JWT_SECRET missing in .env");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");

    if (await Question.countDocuments() === 0) {
      await Question.insertMany(sampleQuestions);
      console.log("Sample questions inserted");
    }

    app.listen(5000, () => {
      const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
    });
  } catch (error) {
    console.error("Startup error:", error.message);
    process.exit(1);
  }
}

start();
