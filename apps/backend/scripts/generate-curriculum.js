const fs = require('fs');
const path = require('path');

const parsedDataPath = path.join(__dirname, '../src/data/reference/parsed_modules.json');
const gradesDir = path.join(__dirname, '../src/data/grades');

const rawData = JSON.parse(fs.readFileSync(parsedDataPath, 'utf8'));

// Normalizing keys because they have trailing spaces in Excel
function normalizeKey(obj, possibleKeys) {
  for (const key of Object.keys(obj)) {
    for (const pk of possibleKeys) {
      if (key.trim().toLowerCase() === pk.toLowerCase()) {
        return obj[key];
      }
    }
  }
  return null;
}

const modules = rawData.Sheet1 || [];

const gradeMap = {};

modules.forEach(row => {
  const moduleName = normalizeKey(row, ['module name', 'module name ']);
  let grade = normalizeKey(row, ['Grade']);
  const status = normalizeKey(row, ['Status']) || 'active';
  const vercelLink = normalizeKey(row, ['Vercel link', 'Vercel link ']);

  if (!moduleName) return;
  if (!grade) {
      // try to infer from previous or default to 1
      grade = '1';
  }
  const gradeKey = `grade${grade}`;
  
  if (!gradeMap[gradeKey]) {
    gradeMap[gradeKey] = [];
  }
  
  gradeMap[gradeKey].push({
    id: moduleName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    title: moduleName.trim(),
    status: status.toLowerCase() === 'completed' || status.toLowerCase() === 'complete' ? 'completed' : 'active',
    vercelLink: vercelLink ? vercelLink.trim().replace(/^"|"$/g, '') : '#'
  });
});

// For each grade, construct the curriculum
Object.keys(gradeMap).forEach(gradeKey => {
  const topics = gradeMap[gradeKey];
  
  // We'll create one single chapter for the grade to hold all topics for simplicity,
  // or we can just group them arbitrarily (e.g. 5 topics per chapter). Let's group 5 per chapter.
  
  const chapters = [];
  let chapterIndex = 1;
  for (let i = 0; i < topics.length; i += 5) {
    const chunk = topics.slice(i, i + 5).map((t, idx) => {
        // Generate robust dynamic data for each lesson
        return {
            id: t.id,
            title: t.title,
            status: t.status,
            icon: "star",
            vercelLink: t.vercelLink,
            estimatedTime: Math.floor(Math.random() * 15 + 10) + " mins",
            difficulty: ["Beginner", "Intermediate", "Advanced"][Math.floor(Math.random() * 3)],
            xpReward: Math.floor(Math.random() * 50 + 50),
            gemsReward: Math.floor(Math.random() * 3 + 1),
            heroSlide: {
                tag: "Today's Adventure",
                lessonId: t.id,
                title: t.title,
                subtitle: `Learn all about ${t.title} in this exciting lesson!`,
                ctaText: "Start Learning →",
                ctaUrl: t.vercelLink,
                visualizerKey: "place-value", // dummy placeholder
                visualizerData: { number: 123 } // dummy placeholder
            },
            actionCards: {
                architecture: t.vercelLink,
                video: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", // dummy video
                edunotes: "/student/lesson/edunotes",
                practice: "/student/quiz/practice-1"
            },
            aiContext: `The student is currently learning about ${t.title}.`
        };
    });
    chapters.push({
      id: `chap_${chapterIndex}`,
      chapterNumber: chapterIndex,
      title: `Chapter ${chapterIndex}`,
      topicsCount: chunk.length,
      topics: chunk
    });
    chapterIndex++;
  }

  const curriculum = {
    activeTopic: chapters[0] && chapters[0].topics[0] ? chapters[0].topics[0] : null,
    standaloneTopics: [],
    chapters: chapters
  };

  const gradePath = path.join(gradesDir, gradeKey);
  if (!fs.existsSync(gradePath)) {
    fs.mkdirSync(gradePath, { recursive: true });
  }

  fs.writeFileSync(path.join(gradePath, 'curriculum.json'), JSON.stringify(curriculum, null, 2));
  console.log(`Generated ${gradeKey}/curriculum.json`);
});

console.log('Curriculum generation complete.');
