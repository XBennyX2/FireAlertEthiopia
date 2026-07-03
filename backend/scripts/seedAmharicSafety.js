require('dotenv').config();
const mongoose = require('mongoose');
const User     = require('../models/User');
const SafetyContent = require('../models/SafetyContent');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);

  // Find an admin to use as the author
  const admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    console.error('No admin user found. Create one first.');
    process.exit(1);
  }

  const content = [
    // ── Prevention ──────────────────────────────────────────────────
    {
      title:    'ምግብ ሲያዘጋጁ ብቻዎን አይተዉ',
      body:     'ምግብ ሲያዘጋጁ ወጥ ቤቱን ፈጽሞ አይለቁ። አዲስ አበባ ውስጥ አብዛኛዎቹ የቤት ውስጥ እሳቶች የሚጀምሩት ቁጥጥር ያልተደረገ ምግብ ከማዘጋጀት ነው። ወጥ ቤቱን ለቅቀው ለመሄድ ከፈለጉ ምድጃውን ያጥፉ።',
      category: 'prevention',
      language: 'am',
    },
    {
      title:    'የእሳት ማጥፊያ ቀረቤ ይኑርዎ',
      body:     'በወጥ ቤትዎ ውስጥ የእሳት ማጥፊያ ያስቀምጡ። ቢያንስ በወር አንድ ጊዜ የእሳት ማጥፊያዎ ሁኔታ ይፈትሹ። ትንሽ እሳት ሲነሳ ወዲያውኑ ለማጥፋት ዝግጁ ይሁኑ።',
      category: 'prevention',
      language: 'am',
    },
    {
      title:    'ኤሌክትሪክ ሽቦዎችን ሊያቃጥሉ ከሚችሉ ነገሮች ያርቁ',
      body:     'ኤሌክትሪክ ሽቦዎችና ሶኬቶች ከጨርቅ፣ ወረቀት እና ሌሎች ሊቃጠሉ ከሚችሉ ነገሮች ርቀው ይሁኑ። ብዙ መሳሪያዎችን ወደ አንድ ሶኬት አያያዙ። ይህ አዲስ አበባ ውስጥ ብዙ የሚስተዋሉ የእሳት ምክንያቶች አንዱ ነው።',
      category: 'prevention',
      language: 'am',
    },
    {
      title:    'ሻማና ዕጣን ሲጠቀሙ ይጠንቀቁ',
      body:     'ሻማ ወይም ዕጣን ሲጠቀሙ ከሚቃጠሉ ነገሮች ሁሉ ያርቁ። ከቤት ሲወጡ ወይም ሲተኙ ሻማን ያጥፉ። ሻማን ሳይቆጣጠሩ ፈጽሞ አይተዉ።',
      category: 'prevention',
      language: 'am',
    },
    // ── Emergency procedures ─────────────────────────────────────
    {
      title:    'እሳት ሲነሳ ምን ማድረግ እንዳለቦት',
      body:     '1. ወዲያውኑ 939ን ይደውሉ።\n2. ሁሉንም ሰዎች ከቤት ያስወጡ — "እሳት!" ብለው ጮኹ።\n3. ሊፍት አይጠቀሙ — በደረጃ ወጡ።\n4. ጭስ ካለ ዝቅ ብለው ይሂዱ።\n5. ደጃፎቹን ለጭስ ይፈትሹ — ሞቅ ካለ አትክፈቱ።\n6. ወደ ደህና ቦታ ከወጡ ሕንፃው ውስጥ አይግቡ።',
      category: 'emergency_procedure',
      language: 'am',
    },
    {
      title:    'ትኩስ ጭስ ካለ እንዴት ይሸሹ',
      body:     'ጭስ ሲኖር ሰውነትዎን ዝቅ አድርጉ እና ይሳቡ። ጭሱ ወደ ላይ ይሄዳል — ወለሉ አቅራቢያ አየሩ ጽዱ ነው። አፍና አፍንጫዎን ለስላሳ ጨርቅ ሸፍኑ። እሳቱ ባለበት አቅጣጫ ፈጽሞ አይሂዱ።',
      category: 'emergency_procedure',
      language: 'am',
    },
    // ── Preparedness ─────────────────────────────────────────────
    {
      title:    'የቤተሰብ የማምለጫ እቅድ ያዘጋጁ',
      body:     'ከቤትዎ ቢያንስ ሁለት የመውጫ መንገዶችን ያውቁ። ሁሉም ቤተሰብ አባላት ከቤት ወጥተው የሚሰበሰቡበት ቦታ ወስኑ። ቢያንስ በዓመት ሁለት ጊዜ ይለማመዱ።',
      category: 'preparedness',
      language: 'am',
    },
    {
      title:    'የጭስ ማስጠንቀቂያ መሳሪያ ይጫኑ',
      body:     'በቤትዎ ውስጥ የጭስ ማስጠንቀቂያ መሳሪያ ይጫኑ። በወር አንድ ጊዜ ይፈትሹ። ባትሪዎቹን በዓመት አንድ ጊዜ ይቀይሩ። ይህ ቀደም ብሎ ስለ እሳት ለማወቅ ቁልፍ ዘዴ ነው።',
      category: 'preparedness',
      language: 'am',
    },
    // ── Emergency contacts ────────────────────────────────────────
    {
      title:    'የአደጋ ጊዜ ስልክ ቁጥሮች — አዲስ አበባ',
      body:     '🔥 እሳት አደጋ: 939\n🚓 ፖሊስ: 991\n🚑 አምቡላንስ: 907\n🏥 የአደጋ ጊዜ አስተዳደር: 011-1-23-83-87\n\nእነዚህ ቁጥሮች 24 ሰዓት፣ 7 ቀን ዝግጁ ናቸው። እሳት ሲያዩ ወዲያውኑ ደውሉ — አትዘናጉ።',
      category: 'contact',
      language: 'am',
    },
  ];

  let created = 0;
  for (const item of content) {
    const existing = await SafetyContent.findOne({ title: item.title, language: 'am' });
    if (!existing) {
      await SafetyContent.create({
        ...item,
        author:      admin._id,
        status:      'approved',
        publishedAt: new Date(),
        isPinned:    item.category === 'contact',
      });
      created++;
    }
  }

  console.log(`Seeded ${created} Amharic safety content items.`);
  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });