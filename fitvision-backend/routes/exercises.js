// routes/exercises.js
// Exercise-related routes

import express from 'express';
import { Exercise } from '../models/Exercise.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Get exercises list (with optional filters)
router.get("/exercises", async (req, res) => {
  try {
    const { muscle, level } = req.query;

    const filter = {};
    if (muscle) {
      filter.muscle_group = muscle;
    }
    if (level) {
      filter.level = level;
    }

    const list = await Exercise.find(filter).sort({ name: 1 }).lean();
    res.json(list);
  } catch (err) {
    logger.error("Error getting exercises", { error: err.message, stack: err.stack });
    res.status(500).json({ error: "Cannot load exercises" });
  }
});

// Get exercise by slug
router.get("/exercises/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const ex = await Exercise.findOne({ slug }).lean();

    if (!ex) {
      return res.status(404).json({ error: "Exercise not found" });
    }

    res.json(ex);
  } catch (err) {
    logger.error("Error getting exercise detail", { error: err.message, stack: err.stack });
    res.status(500).json({ error: "Cannot load exercise detail" });
  }
});

// Seed exercises (dev only)
router.post("/exercises/seed", async (req, res) => {
  try {
    const sample = [
      {
        name: "Push-up",
        slug: "push-up",
        muscle_group: "chest",
        level: "beginner",
        equipment: "bodyweight",
        type: "strength",
        thumbnail_url:
          "https://wger.de/media/exercise-images/316/Push-up-1.png",
        description: "Hít đất cơ bản, tập trung ngực, vai và tay sau.",
        cues: [
          "Giữ thân người thành 1 đường thẳng",
          "Không võng lưng",
          "Hít xuống, thở ra khi đẩy lên",
        ],
      },
      {
        name: "Face Pull",
        slug: "face-pull",
        muscle_group: "back",
        level: "intermediate",
        equipment: "cable",
        type: "strength",
        thumbnail_url:
          "https://wger.de/media/exercise-images/228/Face-pull-1.png",
        description: "Bài tập rất tốt cho vai sau và cải thiện tư thế.",
        cues: [
          "Kéo tay ngang mặt",
          "Giữ khuỷu tay cao",
          "Siết cơ vai sau ở đỉnh động tác",
        ],
      },
      {
        name: "Plank",
        slug: "plank",
        muscle_group: "core",
        level: "beginner",
        equipment: "bodyweight",
        type: "core",
        thumbnail_url:
          "https://wger.de/media/exercise-images/132/Plank-1.png",
        description: "Giữ plank để tăng sức mạnh core và ổn định cột sống.",
        cues: [
          "Giữ người thẳng từ đầu đến gót chân",
          "Không đẩy mông quá cao hoặc quá thấp",
          "Thở đều",
        ],
      },
    ];

    await Exercise.deleteMany({});
    const inserted = await Exercise.insertMany(sample);

    res.json({ ok: true, count: inserted.length });
  } catch (err) {
    logger.error("Seed exercises error", { error: err.message, stack: err.stack });
    res.status(500).json({ error: "Cannot seed exercises" });
  }
});

export default router;

