// scripts/seedExercises.js
// Seed exercise database with sample data

import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../db.js';
import { Exercise } from '../models/Exercise.js';
import logger from '../utils/logger.js';

const exercises = [
  {
    name: "Push-up",
    slug: "push-up",
    muscle_group: "chest",
    level: "beginner",
    equipment: "bodyweight",
    type: "strength",
    thumbnail_url: "https://wger.de/media/exercise-images/316/Push-up-1.png",
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
    thumbnail_url: "https://wger.de/media/exercise-images/228/Face-pull-1.png",
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
    thumbnail_url: "https://wger.de/media/exercise-images/132/Plank-1.png",
    description: "Giữ plank để tăng sức mạnh core và ổn định cột sống.",
    cues: [
      "Giữ người thẳng từ đầu đến gót chân",
      "Không đẩy mông quá cao hoặc quá thấp",
      "Thở đều",
    ],
  },
  {
    name: "Squat",
    slug: "squat",
    muscle_group: "legs",
    level: "beginner",
    equipment: "bodyweight",
    type: "strength",
    thumbnail_url: "https://wger.de/media/exercise-images/90/Squats-1.png",
    description: "Bài tập cơ bản cho chân và mông.",
    cues: [
      "Giữ lưng thẳng",
      "Hạ xuống cho đến khi đùi song song với sàn",
      "Đẩy gót chân để đứng lên",
    ],
  },
  {
    name: "Deadlift",
    slug: "deadlift",
    muscle_group: "back",
    level: "intermediate",
    equipment: "barbell",
    type: "strength",
    thumbnail_url: "https://wger.de/media/exercise-images/88/Deadlift-1.png",
    description: "Bài tập tổng hợp cho lưng, mông và chân.",
    cues: [
      "Giữ lưng thẳng",
      "Nâng từ hông, không từ lưng",
      "Siết cơ mông ở đỉnh động tác",
    ],
  },
];

async function seedExercises() {
  try {
    await connectDB();
    logger.info('Starting exercise seeding...');

    // Clear existing exercises
    await Exercise.deleteMany({});
    logger.info('Cleared existing exercises');

    // Insert new exercises
    const inserted = await Exercise.insertMany(exercises);
    logger.info(`Seeded ${inserted.length} exercises`);

    await disconnectDB();
    logger.info('Seeding completed');
    process.exit(0);
  } catch (err) {
    logger.error('Seeding failed', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

seedExercises();


