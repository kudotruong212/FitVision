import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import axios from "axios";
import cloudinary from "../cloudinary.js";
import { app, encryptSensitive, decryptSensitive } from "../index.js";
import { connectDB, disconnectDB } from "../db.js";
import { ScanSession } from "../models/ScanSession.js";

jest.mock("axios");
jest.mock("../cloudinary.js", () => ({
  __esModule: true,
  default: {
    uploader: {
      upload: jest.fn(),
      destroy: jest.fn(),
    },
    url: jest.fn(),
  },
}));

const mockedAxios = axios;
const mockedCloudinary = cloudinary;

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  await connectDB();
});

afterAll(async () => {
  await disconnectDB();
  await mongo.stop();
});

afterEach(async () => {
  jest.clearAllMocks();
  await mongoose.connection.dropDatabase();
});

async function registerAndLogin() {
  const email = `user${Date.now()}@test.com`;
  const password = "Aa123456!";
  const registerRes = await request(app).post("/api/auth/register").send({
    name: "Tester",
    email,
    password,
  });
  expect(registerRes.status).toBe(200);
  return {
    token: registerRes.body.token,
    email,
    password,
  };
}

describe("Protected AI routes", () => {
  it("allows authenticated users to analyze and returns quota info", async () => {
    mockedCloudinary.uploader.upload.mockResolvedValue({
      secure_url: "https://cdn.fake/image.jpg",
      public_id: "img123",
    });
    mockedCloudinary.url.mockReturnValue("https://cdn.fake/signed-image.jpg");
    mockedAxios.post.mockResolvedValue({
      data: {
        filename: "pose.jpg",
        size_kb: 123,
        posture: "Neutral",
        weak_muscles: ["core"],
        fat_area: "abdomen",
        score: 78,
        recommendations: [],
        body_shape: "Rectangle",
        risk_level: "medium",
        notes: "",
        pose_confidence: 0.9,
        pose_points: [],
      },
    });

    const { token } = await registerAndLogin();

    const res = await request(app)
      .post("/api/ai/analyze")
      .set("Authorization", `Bearer ${token}`)
      .attach("image", Buffer.from("fake image"), "pose.jpg");

    expect(res.status).toBe(200);
    expect(res.body.image_url).toBe("https://cdn.fake/image.jpg");
    expect(res.body.quota).toBeDefined();
    expect(res.body.quota.left).toBeLessThan(res.body.quota.max);
  });

  it("saves scans securely and exposes signed URLs via history", async () => {
    mockedCloudinary.url.mockReturnValue("https://signed-url.fake/image.jpg");

    const { token } = await registerAndLogin();
    const analysis = {
      filename: "scan.jpg",
      size_kb: 200,
      posture: "Neutral",
      weak_muscles: ["glutes"],
      fat_area: "waist",
      score: 70,
      recommendations: [],
      body_shape: "Rectangle",
      risk_level: "low",
      notes: "",
      pose_confidence: 0.8,
      pose_points: [],
      pose_warning: null,
      image_url: "https://raw-upload/image.jpg",
      image_public_id: "cloudinary-public-id",
    };

    const saveRes = await request(app)
      .post("/api/scan/save")
      .set("Authorization", `Bearer ${token}`)
      .send({ analysis, plan: { level: "beginner" } });

    expect(saveRes.status).toBe(200);
    const stored = await ScanSession.findById(saveRes.body.id).lean();
    expect(stored.image_url).not.toBe(analysis.image_url);

    const historyRes = await request(app)
      .get("/api/scan/history")
      .set("Authorization", `Bearer ${token}`);
    expect(historyRes.status).toBe(200);
    expect(historyRes.body[0].signed_image_url).toContain("https://signed-url");
  });

  it("allows users to delete scans and remove Cloudinary assets", async () => {
    mockedCloudinary.uploader.destroy.mockResolvedValue({ result: "ok" });

    const { token } = await registerAndLogin();
    const analysis = {
      filename: "scan.jpg",
      size_kb: 180,
      posture: "Neutral",
      weak_muscles: [],
      fat_area: "waist",
      score: 70,
      recommendations: [],
      body_shape: "Rectangle",
      risk_level: "low",
      notes: "",
      pose_confidence: 0.8,
      pose_points: [],
      image_public_id: "cloudinary-public-id",
    };

    const saveRes = await request(app)
      .post("/api/scan/save")
      .set("Authorization", `Bearer ${token}`)
      .send({ analysis, plan: null });
    expect(saveRes.status).toBe(200);

    const deleteRes = await request(app)
      .delete(`/api/scan/${saveRes.body.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(deleteRes.status).toBe(200);
    expect(mockedCloudinary.uploader.destroy).toHaveBeenCalled();

    const historyRes = await request(app)
      .get("/api/scan/history")
      .set("Authorization", `Bearer ${token}`);
    expect(historyRes.body.length).toBe(0);
  });
});

describe("Stats endpoint", () => {
  it("aggregates score data over sessions", async () => {
    const { token } = await registerAndLogin();
    const analysis = {
      filename: "scan.jpg",
      size_kb: 123,
      posture: "Neutral",
      weak_muscles: [],
      fat_area: "arms",
      score: 65,
      recommendations: [],
      body_shape: "Rectangle",
      risk_level: "low",
      notes: "",
      pose_confidence: 0.7,
      pose_points: [],
      pose_warning: null,
      image_url: "https://raw-upload/image.jpg",
      image_public_id: "cloudinary-public-id",
    };

    await request(app)
      .post("/api/scan/save")
      .set("Authorization", `Bearer ${token}`)
      .send({ analysis, plan: null });

    // Update createdAt for diversity
    const doc = await ScanSession.findOne();
    await ScanSession.findByIdAndUpdate(doc._id, {
      createdAt: new Date(Date.now() - 86400000),
    });

    const statsRes = await request(app).get("/api/stats/scan-summary");
    expect(statsRes.status).toBe(200);
    expect(statsRes.body.totalScans).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(statsRes.body.byDay)).toBe(true);
  });
});

describe("Workout plan endpoint", () => {
  it("returns GPT-generated plan when AI service responds", async () => {
    mockedAxios.post.mockImplementation((url) => {
      if (url.includes("/ai/plan/generate")) {
        return Promise.resolve({
          data: {
            level: "Intermediate",
            sessions_per_week: 4,
            focus_areas: ["upper back", "core"],
            sessions: [
              {
                title: "Buổi 1 – upper back",
                focus: ["upper back"],
                exercises: [{ name: "Seated Row", sets: 3, reps: "10-12" }],
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    const res = await request(app).post("/api/plan/generate").send({
      score: 72,
      weak_muscles: ["upper back"],
      fat_area: "waist",
    });

    expect(res.status).toBe(200);
    expect(res.body.level).toBe("Intermediate");
    expect(res.body.sessions_per_week).toBe(4);
    expect(res.body.focus_areas).toContain("upper back");
  });

  it("falls back to heuristic plan if AI service fails", async () => {
    mockedAxios.post.mockImplementation((url) => {
      if (url.includes("/ai/plan/generate")) {
        return Promise.reject(new Error("AI unavailable"));
      }
      return Promise.resolve({ data: {} });
    });

    const res = await request(app).post("/api/plan/generate").send({
      score: 40,
      weak_muscles: ["shoulder"],
    });

    expect(res.status).toBe(200);
    expect(res.body.source).toBe("fallback");
    expect(res.body.sessions.length).toBeGreaterThan(0);
  });
});

describe("Profile routes", () => {
  it("returns default profile and persists updates", async () => {
    const { token } = await registerAndLogin();

    const initial = await request(app)
      .get("/api/profile/me")
      .set("Authorization", `Bearer ${token}`);
    expect(initial.status).toBe(200);
    expect(initial.body.experience_level).toBe("beginner");
    expect(initial.body.preferred_modalities).toEqual([]);

    const updateRes = await request(app)
      .put("/api/profile/me")
      .set("Authorization", `Bearer ${token}`)
      .send({
        goal: "Giảm mỡ & cải thiện tư thế",
        experience_level: "intermediate",
        preferred_modalities: "yoga, pilates",
        equipment: ["bands", "dumbbell"],
        weekly_sessions_target: 4,
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.goal).toContain("Giảm mỡ");
    expect(updateRes.body.preferred_modalities).toEqual(["yoga", "pilates"]);
    expect(updateRes.body.equipment).toContain("bands");
    expect(updateRes.body.weekly_sessions_target).toBe(4);
  });
});

describe("Weekly report export", () => {
  it("returns CSV data for the authenticated user", async () => {
    const { token } = await registerAndLogin();
    const analysis = {
      filename: "scan.jpg",
      size_kb: 180,
      posture: "Neutral",
      weak_muscles: ["core"],
      fat_area: "abdomen",
      score: 74,
      recommendations: [],
      body_shape: "Rectangle",
      risk_level: "medium",
      notes: "",
      pose_confidence: 0.8,
      pose_points: [],
    };

    await request(app)
      .post("/api/scan/save")
      .set("Authorization", `Bearer ${token}`)
      .send({ analysis, plan: null });

    const reportRes = await request(app)
      .get("/api/reports/weekly")
      .set("Authorization", `Bearer ${token}`);

    expect(reportRes.status).toBe(200);
    expect(reportRes.headers["content-type"]).toContain("text/csv");
    expect(reportRes.text).toContain("score");
    expect(reportRes.text.split("\n").length).toBeGreaterThan(1);
  });
});

describe("Coach chat routes", () => {
  it("stores history and blocks unsafe content", async () => {
    mockedAxios.post.mockImplementation((url) => {
      if (url.includes("/ai/chat")) {
        return Promise.resolve({ data: { answer: "Chào bạn, hãy giữ lưng thẳng." } });
      }
      return Promise.resolve({ data: {} });
    });

    const { token } = await registerAndLogin();

    const initialHistory = await request(app)
      .get("/api/coach/thread")
      .set("Authorization", `Bearer ${token}`);
    expect(initialHistory.status).toBe(200);
    expect(initialHistory.body).toEqual([]);

    const chatRes = await request(app)
      .post("/api/coach/chat")
      .set("Authorization", `Bearer ${token}`)
      .send({ user_message: "Mình nên tập gì cho core?" });

    expect(chatRes.status).toBe(200);
    expect(chatRes.body.reply).toContain("Chào bạn");
    expect(chatRes.body.history.length).toBeGreaterThan(0);

    const historyAfter = await request(app)
      .get("/api/coach/thread")
      .set("Authorization", `Bearer ${token}`);
    expect(historyAfter.body.length).toBeGreaterThan(0);

    const guardrailRes = await request(app)
      .post("/api/coach/chat")
      .set("Authorization", `Bearer ${token}`)
      .send({ user_message: "tự tử thì sao?" });
    expect(guardrailRes.status).toBe(400);
  });
});

describe("Encryption helpers", () => {
  it("encrypts and decrypts sensitive values", () => {
    const secret = "https://cdn.fake/private.jpg";
    const cipher = encryptSensitive(secret);
    expect(cipher).not.toEqual(secret);
    const plain = decryptSensitive(cipher);
    expect(plain).toEqual(secret);
  });
});



