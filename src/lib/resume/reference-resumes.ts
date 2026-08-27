import { ResumeData } from "@/types/resume"

export interface ReferenceResumeProfile {
  slug: string
  title: string
  category: "Technology" | "Business" | "Students"
  experienceLevel: string
  templateId: string
  description: string
  highlights: string[]
  sampleData: Partial<ResumeData>
}

export const REFERENCE_RESUMES: ReferenceResumeProfile[] = [
  {
    slug: "android-developer",
    title: "Android Developer",
    category: "Technology",
    experienceLevel: "3+ Years Experience",
    templateId: "technical",
    description: "ATS-friendly resume for Android engineers specializing in Kotlin, Jetpack Compose, Coroutines, and mobile architecture.",
    highlights: ["Kotlin & Jetpack Compose", "Clean Architecture & MVVM", "REST API & Firebase", "Play Store Publishing"],
    sampleData: {
      title: "Android Developer Resume",
      targetRole: "Android Developer",
      basics: {
        name: "Alex Morgan",
        title: "Senior Android Developer",
        email: "alex.morgan@example.com",
        phone: "+1 (555) 234-5678",
        location: "San Francisco, CA",
        linkedin: "linkedin.com/in/alexmorgan-android",
        portfolio: "alexmorgan.dev",
        github: "github.com/alexmorgan-dev",
      },
      summary: "Results-driven Android Developer with 3.5+ years of experience engineering high-performance mobile applications using Kotlin and Jetpack Compose. Proven track record of improving app load times and delivering modern user interfaces following Clean Architecture principles.",
      experience: [
        {
          id: "exp_1",
          company: "Apex Mobile Innovations",
          position: "Android Software Engineer",
          location: "San Francisco, CA",
          startDate: "2023-01",
          endDate: "Present",
          current: true,
          bullets: [
            "Architected and published modern Android apps serving over 150,000 active users utilizing Kotlin, Jetpack Compose, and Coroutines.",
            "Reduced application crash rates by implementing robust error handling and migrating legacy Java modules to modern Kotlin coroutines.",
            "Integrated RESTful API services with Retrofit, Room local persistence database, and Firebase Cloud Messaging for push notifications.",
            "Collaborated with cross-functional product and UI/UX design teams in an Agile environment to launch 6 major app feature releases.",
          ],
        },
        {
          id: "exp_2",
          company: "ByteCraft Solutions",
          position: "Junior Mobile Developer",
          location: "San Jose, CA",
          startDate: "2021-06",
          endDate: "2022-12",
          current: false,
          bullets: [
            "Developed feature modules for enterprise Android applications adhering to MVVM design patterns and Jetpack Navigation component.",
            "Optimized image loading and memory utilization across low-end mobile devices, improving app responsiveness.",
            "Wrote unit tests using JUnit and Mockk to maintain comprehensive test coverage across core view models.",
          ],
        },
      ],
      education: [
        {
          id: "edu_1",
          institution: "California State University",
          degree: "Bachelor of Science",
          field: "Computer Science",
          startDate: "2017",
          endDate: "2021",
          details: "Graduated with Honors. Coursework: Mobile Computing, Data Structures, Operating Systems, Software Engineering.",
        },
      ],
      skills: [
        {
          id: "skill_1",
          category: "Languages & Core",
          items: ["Kotlin", "Java", "Android SDK", "Jetpack Compose", "Coroutines & Flow"],
        },
        {
          id: "skill_2",
          category: "Architecture & Tools",
          items: ["MVVM / Clean Architecture", "Dagger Hilt / Koin", "Room Database", "Retrofit", "Git / GitHub"],
        },
        {
          id: "skill_3",
          category: "Testing & DevOps",
          items: ["JUnit", "Mockk", "Espresso", "Firebase App Distribution", "CI/CD Pipelines"],
        },
      ],
      projects: [
        {
          id: "proj_1",
          name: "FitTrack - Mobile Fitness Companion",
          description: "Open-source Android workout tracker built with Jetpack Compose, WorkManager, and Health Connect API.",
          technologies: ["Kotlin", "Jetpack Compose", "Room", "Hilt"],
          url: "github.com/alexmorgan-dev/fittrack",
        },
      ],
      certifications: ["Associate Android Developer Certification (Google)"],
      achievements: ["Hackathon Winner - Best Mobile Innovation 2023"],
      languages: ["English (Native)", "Spanish (Professional)"],
    },
  },
  {
    slug: "software-engineer",
    title: "Software Engineer",
    category: "Technology",
    experienceLevel: "2-5 Years Experience",
    templateId: "modern-pro",
    description: "Versatile software engineering template focusing on full-stack web platforms, microservices, and system reliability.",
    highlights: ["React & TypeScript", "Node.js & Python", "PostgreSQL & Docker", "Cloud & Microservices"],
    sampleData: {
      title: "Software Engineer Resume",
      targetRole: "Software Engineer",
      basics: {
        name: "David Chen",
        title: "Full Stack Software Engineer",
        email: "david.chen@example.com",
        phone: "+1 (555) 987-6543",
        location: "Seattle, WA",
        linkedin: "linkedin.com/in/davidchen-swe",
        portfolio: "davidchen.dev",
        github: "github.com/davidchen",
      },
      summary: "Full-Stack Software Engineer with 4 years of experience building scalable web applications and microservices using TypeScript, React, Node.js, and Cloud Infrastructure. Passionate about writing clean maintainable code and optimizing system performance.",
      experience: [
        {
          id: "exp_1",
          company: "CloudScale Technologies",
          position: "Software Engineer",
          location: "Seattle, WA",
          startDate: "2022-03",
          endDate: "Present",
          current: true,
          bullets: [
            "Designed and implemented microservices handling 5M+ API requests daily using Node.js, Express, and PostgreSQL.",
            "Built responsive React web dashboard interfaces with TypeScript and Tailwind CSS, improving user engagement metrics.",
            "Containerized core services with Docker and managed deployment automated pipelines via GitHub Actions.",
          ],
        },
      ],
      education: [
        {
          id: "edu_1",
          institution: "University of Washington",
          degree: "BS in Computer Science",
          field: "Software Engineering",
          startDate: "2018",
          endDate: "2022",
          details: "Dean's Honor List. President of ACM Student Chapter.",
        },
      ],
      skills: [
        { id: "s1", category: "Frontend", items: ["React", "Next.js", "TypeScript", "Tailwind CSS", "HTML5/CSS3"] },
        { id: "s2", category: "Backend & Cloud", items: ["Node.js", "Express", "Python", "PostgreSQL", "Docker", "AWS"] },
      ],
      projects: [
        {
          id: "p1",
          name: "DevHub Workflow Platform",
          description: "Real-time task and code collaboration tool built with Next.js, WebSockets, and Redis.",
          technologies: ["Next.js", "TypeScript", "WebSockets", "Redis"],
        },
      ],
      certifications: ["AWS Certified Developer - Associate"],
      achievements: ["Featured speaker at Seattle Tech Conference 2024"],
      languages: ["English (Fluent)", "Mandarin (Native)"],
    },
  },
  {
    slug: "frontend-developer",
    title: "Frontend Developer",
    category: "Technology",
    experienceLevel: "2+ Years Experience",
    templateId: "ats-classic",
    description: "Tailored frontend developer resume emphasizing modern Javascript frameworks, UI performance, and accessibility.",
    highlights: ["React & Next.js", "State Management", "Web Vitals Optimization", "UI/UX Design Systems"],
    sampleData: {
      title: "Frontend Developer Resume",
      targetRole: "Frontend Developer",
      basics: {
        name: "Maya Patel",
        title: "Frontend Web Developer",
        email: "maya.patel@example.com",
        phone: "+1 (555) 345-6789",
        location: "Austin, TX",
        linkedin: "linkedin.com/in/mayapatel-fe",
        portfolio: "mayapatel.design",
      },
      summary: "Creative Frontend Developer specializing in React, Next.js, and responsive UI design systems. Experienced in converting complex Figma designs into pixel-perfect accessible web experiences.",
      experience: [
        {
          id: "exp_1",
          company: "Pixel Craft Studio",
          position: "Frontend Developer",
          location: "Austin, TX",
          startDate: "2022-08",
          endDate: "Present",
          current: true,
          bullets: [
            "Developed responsive web applications for enterprise clients using React, Next.js, and CSS Modules.",
            "Improved Google Core Web Vitals score from 65 to 94 through asset optimization and lazy loading strategies.",
          ],
        },
      ],
      education: [
        { id: "edu_1", institution: "UT Austin", degree: "B.S. Information Technology", field: "Web Development", startDate: "2018", endDate: "2022", details: "" },
      ],
      skills: [
        { id: "s1", category: "Core Technologies", items: ["React", "JavaScript (ES6+)", "TypeScript", "CSS3 / Sass", "Figma"] },
      ],
      projects: [],
      certifications: ["Meta Frontend Developer Professional Certificate"],
      achievements: [],
      languages: ["English"],
    },
  },
  {
    slug: "ai-engineer",
    title: "AI Engineer",
    category: "Technology",
    experienceLevel: "3+ Years Experience",
    templateId: "technical",
    description: "Specialized resume for AI/ML developers working with LLMs, RAG workflows, PyTorch, and AI Agent frameworks.",
    highlights: ["LLMs & RAG Pipelines", "PyTorch & LangChain", "Python & Vector DBs", "Model Fine-Tuning"],
    sampleData: {
      title: "AI Engineer Resume",
      targetRole: "AI Engineer",
      basics: {
        name: "Dr. Ethan Vance",
        title: "AI & Machine Learning Engineer",
        email: "ethan.vance@example.com",
        phone: "+1 (555) 876-5432",
        location: "Boston, MA",
        linkedin: "linkedin.com/in/ethanvance-ai",
        portfolio: "ethanvance.ai",
      },
      summary: "AI Engineer with experience building custom RAG pipelines, fine-tuning open-source LLMs, and deploying autonomous AI Agent systems into production environments.",
      experience: [
        {
          id: "exp_1",
          company: "Cognitive AI Labs",
          position: "Senior AI Engineer",
          location: "Boston, MA",
          startDate: "2023-02",
          endDate: "Present",
          current: true,
          bullets: [
            "Engineered enterprise RAG search architecture using Python, LangChain, and Qdrant vector database.",
            "Fine-tuned Llama 3 models on proprietary datasets resulting in 25% improved domain accuracy.",
          ],
        },
      ],
      education: [
        { id: "edu_1", institution: "MIT", degree: "Master of Science", field: "Artificial Intelligence", startDate: "2020", endDate: "2022", details: "" },
      ],
      skills: [
        { id: "s1", category: "AI & ML Frameworks", items: ["PyTorch", "TensorFlow", "LangChain", "LlamaIndex", "Hugging Face"] },
        { id: "s2", category: "Languages & Databases", items: ["Python", "C++", "Pinecone", "Qdrant", "PostgreSQL (pgvector)"] },
      ],
      projects: [],
      certifications: ["DeepLearning.AI Generative AI Specialization"],
      achievements: [],
      languages: ["English"],
    },
  },
  {
    slug: "computer-science-graduate",
    title: "Computer Science Graduate",
    category: "Students",
    experienceLevel: "Fresher / Student",
    templateId: "graduate",
    description: "Perfect resume template for recent CS graduates and interns highlighting academic coursework and capstone projects.",
    highlights: ["Data Structures & Algorithms", "Full Stack Projects", "Academic Excellence", "Hackathon Contributions"],
    sampleData: {
      title: "Fresh CS Graduate Resume",
      targetRole: "Software Engineering Intern / Fresher",
      basics: {
        name: "Jordan Lee",
        title: "Computer Science Graduate",
        email: "jordan.lee@example.edu",
        phone: "+1 (555) 432-1098",
        location: "Chicago, IL",
        linkedin: "linkedin.com/in/jordanlee-cs",
        github: "github.com/jordanlee-code",
        portfolio: "jordanlee.dev",
      },
      summary: "Motivated Computer Science graduate with strong foundations in Data Structures, Algorithms, and Software Development. Eager to contribute to high-impact software engineering teams.",
      experience: [
        {
          id: "exp_1",
          company: "Tech Startups Incubator",
          position: "Software Engineer Intern",
          location: "Chicago, IL",
          startDate: "2024-05",
          endDate: "2024-08",
          current: false,
          bullets: [
            "Assisted in developing web application components using React and Node.js.",
            "Participated in daily standups, code reviews, and automated integration testing.",
          ],
        },
      ],
      education: [
        { id: "edu_1", institution: "University of Illinois Chicago", degree: "B.S. in Computer Science", field: "Software Systems", startDate: "2021", endDate: "2025", details: "GPA: 3.8 / 4.0. Relevant Coursework: Algorithms, Database Systems, Web Development." },
      ],
      skills: [
        { id: "s1", category: "Core Languages", items: ["Java", "Python", "JavaScript", "C++", "SQL"] },
        { id: "s2", category: "Tools & Technologies", items: ["Git", "React", "Node.js", "Docker", "VS Code"] },
      ],
      projects: [
        {
          id: "p1",
          name: "Campus Connect Platform (Capstone)",
          description: "Full-stack student networking website built with MERN stack.",
          technologies: ["React", "Express", "MongoDB", "Node.js"],
        },
      ],
      certifications: [],
      achievements: ["Dean's Honor List 2022-2025", "1st Place University Hackathon 2024"],
      languages: ["English"],
    },
  },
  {
    slug: "product-manager",
    title: "Product Manager",
    category: "Business",
    experienceLevel: "3+ Years Experience",
    templateId: "executive",
    description: "Strategic resume layout designed for Product Managers highlighting product roadmap execution, data analytics, and user growth.",
    highlights: ["Product Strategy & Roadmap", "Agile & Scrum", "Data Analytics (Mixpanel)", "User Research"],
    sampleData: {
      title: "Product Manager Resume",
      targetRole: "Product Manager",
      basics: {
        name: "Samantha Wright",
        title: "Product Manager",
        email: "samantha.wright@example.com",
        phone: "+1 (555) 654-3210",
        location: "New York, NY",
        linkedin: "linkedin.com/in/samanthawright-pm",
        portfolio: "samanthawright.com",
      },
      summary: "Data-driven Product Manager with 4+ years of experience leading cross-functional teams to build SaaS product features from inception to launch.",
      experience: [
        {
          id: "exp_1",
          company: "Nexus SaaS Technologies",
          position: "Product Manager",
          location: "New York, NY",
          startDate: "2022-01",
          endDate: "Present",
          current: true,
          bullets: [
            "Led product feature development lifecycle for core SaaS subscription model, increasing monthly conversion by 18%.",
            "Conducted quantitative and qualitative user research with 50+ enterprise clients to prioritize product backlog.",
          ],
        },
      ],
      education: [
        { id: "edu_1", institution: "NYU Stern", degree: "B.S. in Business & Technology", field: "Product Strategy", startDate: "2017", endDate: "2021", details: "" },
      ],
      skills: [
        { id: "s1", category: "Product & Strategy", items: ["Roadmapping", "A/B Testing", "Agile/Scrum", "User Research", "Wireframing"] },
        { id: "s2", category: "Analytics & Tools", items: ["Mixpanel", "Jira", "Figma", "Google Analytics", "SQL"] },
      ],
      projects: [],
      certifications: ["Certified Scrum Product Owner (CSPO)"],
      achievements: [],
      languages: ["English"],
    },
  },
]
