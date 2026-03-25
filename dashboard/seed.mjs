const leads = [
  {
    name: "Satya Nadella",
    company: "Microsoft",
    designation: "CEO",
    location: "Redmond, WA",
    email: "satya@microsoft.com",
    phone: "+1-555-0101",
    profileUrl: "https://linkedin.com/in/satyanadella",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/7/78/MS-Exec-Nadella-Satya-2017-08-31-22_04_43.jpg",
    connectionCount: "500+",
    bio: "CEO of Microsoft."
  },
  {
    name: "Sundar Pichai",
    company: "Google",
    designation: "CEO",
    location: "Mountain View, CA",
    email: "sundar@google.com",
    phone: "+1-555-0202",
    profileUrl: "https://linkedin.com/in/sundarpichai",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/d/d6/Sundar_pichai.png",
    connectionCount: "500+",
    bio: "CEO of Google and Alphabet."
  },
  {
    name: "Sam Altman",
    company: "OpenAI",
    designation: "CEO",
    location: "San Francisco, CA",
    email: "sam@openai.com",
    phone: "+1-555-0303",
    profileUrl: "https://linkedin.com/in/samaltman",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/5/5c/Sam_Altman_Portrait.jpg",
    connectionCount: "500+",
    bio: "CEO of OpenAI."
  }
];

async function seed() {
  for (const lead of leads) {
    try {
      const res = await fetch("http://localhost:3000/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
      });
      console.log(`Saved ${lead.name}:`, res.status);
    } catch (err) {
      console.error(`Error saving ${lead.name}:`, err.message);
    }
  }
}

seed();
