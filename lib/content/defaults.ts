import type { Block, BlockData, BlockType, Page, SiteContent } from "./types";

// Initial site content, adapted from the live SEC Career Fair site
// (careerfair.sec.tamu.edu) for the Fall 2026 fair. Admins edit a copy of
// this document in the studio; these values are only the starting point and
// the fallback when the database is unavailable.

function blk<K extends BlockType>(
  id: string,
  type: K,
  data: BlockData[K],
  options: Partial<Pick<Block, "nav" | "group" | "tone" | "visible">> = {},
): Block {
  return { id, type, visible: true, nav: "", group: "", tone: "plain", ...options, data } as Block;
}

const EMAIL = "careerfair@sec.tamu.edu";
const LEGENDS_MAP = "https://maps.app.goo.gl/7bvzrKNQM3WjLna39";
const HIREAGGIES_STUDENTS = "https://tamu-csm.symplicity.com/students";
const SYMPLICITY_EMPLOYERS = "https://tamu-csm.symplicity.com/employers/index.php?signin_tab=0";
const img = (src: string, alt: string) => ({ src, alt });
const noImg = { src: "", alt: "" };

const MAILING_ADDRESS =
  "<p>Student Engineers’ Council<br>ATTN: Career Fair<br>3127 Texas A&amp;M University (TAMU)<br>College Station, TX 77843-3127</p>";

const coChairs = [
  { name: "Nathan Lam ’27", role: "Spring 2026 & Fall 2026 Career Fair Co-Chair", phone: "(346) 317-9414" },
  { name: "Raul Lozano ’27", role: "Fall 2026 & Spring 2027 Career Fair Co-Chair", phone: "(469) 974-5581" },
];

const hotels = [
  ["The Stella Hotel", "(979) 421-4000", "4100 Lake Atlas Dr"],
  ["The George", "(979) 485-5638", "180 Century Ct"],
  ["Cavalry Court", "(844) 313-7337", "200 Century Ct"],
  ["The Texas A&M Hotel", "(979) 260-5000", "177 Joe Routt Blvd"],
  ["Hyatt Place", "(979) 846-9800", "1100 University Dr. East"],
  ["Holiday Inn Express", "(979) 846-8700", "1203 University Dr. East"],
  ["Hampton Inn", "(979) 846-0184", "320 Texas Ave. South"],
  ["Best Western Premiere", "(979) 731-5300", "1920 Austin’s Colony Pkwy"],
  ["Courtyard Marriott", "(979) 695-8111", "3939 Highway 6 South"],
  ["Four Points by Sheraton", "(979) 693-1741", "1503 Texas Ave. South"],
  ["Best Western Plus Inn & Suites", "(979) 704-6444", "950 Arrington Rd"],
  ["La Quinta Inn & Suites", "(979) 704-6100", "1838 Graham Rd"],
  ["Fairfield Inn", "(979) 268-1552", "4613 South Texas Ave"],
  ["Days Inn", "(979) 696-6988", "2514 Texas Ave"],
  ["TownePlace Suites by Marriott", "(979) 260-8500", "1300 University Dr. East"],
  ["Ramada College Station", "(979) 846-0300", "506 Earl Rudder Fwy. South"],
].map((cells) => ({ cells }));

const team = [
  ["Nathan Lam ’27", "Career Fair Co-Chair", "Computer Engineering", "nathan-lam"],
  ["Raul Lozano ’27", "Career Fair Co-Chair", "Electrical Engineering", "raul-lozano"],
  ["Jaydon Castillo ’28", "Company Chat Co-Coordinator", "Multidisciplinary Engineering Technology", "jaydon-castillo"],
  ["Sofia Irahola ’27", "Company Chat Co-Coordinator", "Aerospace Engineering", "sofia-irahola"],
  ["Nayeon Lee ’28", "Hospitality Co-Coordinator", "Industrial Engineering", "nayeon-lee"],
  ["Sedra Hakim ’28", "Hospitality Co-Coordinator", "Aerospace Engineering", "sedra-hakim"],
  ["Nikhila Manikandan ’29", "Marketing Co-Coordinator", "Computer Science", "nikhila-manikandan"],
  ["Tanvi Devineni ’28", "Marketing Co-Coordinator", "Electrical Engineering", "tanvi-devineni"],
  ["Cathy Molyneux ’27", "Operations Co-Coordinator", "Biomedical Engineering", "cathy-molyneux"],
  ["Landon Bargainer ’28", "Operations Co-Coordinator", "Mechanical Engineering", "landon-bargainer"],
  ["Benny Huges ’27", "Pre-Fair Week Co-Coordinator", "Chemical Engineering", "benny-huges"],
  ["Emma Kaloyanov ’28", "Pre-Fair Week Co-Coordinator", "Chemical Engineering", "emma-kaloyanov"],
  ["Kyle Oubre ’27", "Registration Co-Coordinator", "Chemical Engineering", "kyle-oubre"],
  ["Teresa Barquero ’28", "Registration Co-Coordinator", "Chemical Engineering", "teresa-barquero"],
  ["Aryan Shah ’29", "Systems Co-Coordinator", "Computer Science", "aryan-shah"],
  ["Nitin Achuta ’27", "Systems Co-Coordinator", "Computer Science", "nitin-achuta"],
  ["Ashlynn Gamboa ’28", "Welcome Social Co-Coordinator", "Architectural Engineering", "ashlynn-gamboa"],
  ["Laura Givens ’28", "Welcome Social Co-Coordinator", "Mechanical Engineering", "laura-givens"],
].map(([name, role, major, file]) => ({
  name,
  role,
  major,
  photo: img(`/images/team/${file}.webp`, `Portrait of ${name.replace(/ ’\d+$/, "")}`),
}));

const companyChatPhotos = [1, 2, 3].map((n) =>
  img(`/images/fair/company-chat-${n}.webp`, "Students talking with recruiters at Company Chat"),
);
const welcomeSocialPhotos = [1, 2, 3].map((n) =>
  img(`/images/fair/welcome-social-${n}.webp`, "Students and recruiters networking at the Welcome Social"),
);

// ───────────────────────────────── Home ─────────────────────────────────
const home: Page = {
  id: "home",
  slug: "",
  title: "SEC Engineering Career Fair",
  description:
    "The largest student-run career fair in the nation. September 9–10, 2026 at Legends Event Center, plus a virtual fair on September 11.",
  layout: "landing",
  blocks: [
    blk("home-hero", "hero", {
      eyebrow: "Texas A&M University · Student Engineers’ Council",
      title: "SEC Engineering",
      emphasis: "Career Fair",
      summary: "<p>The premier recruiting event for the College of Engineering at Texas A&amp;M.</p>",
      dates: "September 9–10, 2026",
      location: "Legends Event Center · Bryan, TX",
      image: img("/images/career-fair-hero.webp", "Engineering students in professional attire arriving at the career fair"),
      primary: { label: "I’m a student", href: "/students" },
      secondary: { label: "I’m a recruiter", href: "/recruiters" },
    }),
    blk("home-dates", "keyDates", {
      heading: "Fair week at a glance",
      items: [
        { date: "Aug 24 – Sep 4", title: "Pre-Career Fair Week", meta: "Workshops, tabling & free food", href: "/students#pre-fair-week" },
        { date: "Tue, Sep 8", title: "Company Chat + Welcome Social", meta: "Meet recruiters before the floor opens", href: "/students#company-chat" },
        { date: "Wed–Thu, Sep 9–10", title: "In-person fair", meta: "9 AM – 5 PM · Legends Event Center", href: "/students#dates" },
        { date: "Fri, Sep 11", title: "Virtual fair", meta: "9 AM – 5 PM · HireAggies", href: "/students#virtual-fair" },
      ],
    }),
    blk("home-paths", "pathways", {
      heading: "Find what you need",
      intro: "",
      items: [
        {
          eyebrow: "Students",
          title: "Get ready for fair day",
          body: "<p>Explore internships, co-ops, and full-time roles from 500+ engineering companies. No pre-registration for current students — just bring your A&amp;M ID.</p>",
          cta: { label: "Open the student guide", href: "/students" },
          links: [
            { label: "Dress code", href: "/students#dress-code" },
            { label: "Shuttle & parking", href: "/students#getting-there" },
            { label: "Company list & booth map", href: "/students#company-search" },
            { label: "Pre-Career Fair Week", href: "/students#pre-fair-week" },
            { label: "Student FAQs", href: "/students#faqs" },
          ],
        },
        {
          eyebrow: "Recruiters",
          title: "Plan your company’s visit",
          body: "<p>Connect with 12,000+ Aggie engineers across every discipline and degree level. Registration runs May 6 – August 21 through HireAggies.</p>",
          cta: { label: "Open the recruiter guide", href: "/recruiters" },
          links: [
            { label: "Registration & pricing", href: "/recruiters#registration" },
            { label: "Booth & shipping", href: "/recruiters#booth-shipping" },
            { label: "Parking", href: "/recruiters#parking" },
            { label: "Hotels", href: "/recruiters#hotels" },
            { label: "Recruiter FAQs", href: "/recruiters#faqs" },
          ],
        },
      ],
    }),
    blk("home-about", "about", {
      heading: "About the fair",
      body: "<p>The SEC Engineering Career Fair is planned, organized, and staffed entirely by the Student Engineers’ Council. Each fall, thousands of engineering students meet hundreds of companies hiring for internships, co-ops, and full-time positions across every engineering discipline.</p>",
      stats: [
        { value: "500+", label: "Companies attending" },
        { value: "12,000+", label: "Students attending" },
        { value: "#1", label: "Largest student-run career fair in the nation" },
      ],
    }, { tone: "tint" }),
    blk("home-location", "event", {
      heading: "Date, time & location",
      body: "<p>Join us in person at Legends Event Center, or online through HireAggies the day after.</p>",
      facts: [
        { label: "In-person dates", value: "September 9–10, 2026" },
        { label: "Hours", value: "9:00 AM – 5:00 PM" },
        { label: "Venue", value: "Legends Event Center, 2533 Midtown Park Blvd, Bryan, TX" },
        { label: "Virtual fair", value: "September 11, 2026 · 9:00 AM – 5:00 PM on HireAggies" },
      ],
      links: [
        { label: "Get directions", href: LEGENDS_MAP },
        { label: "HireAggies login", href: HIREAGGIES_STUDENTS },
      ],
      note: "",
      gallery: [],
    }),
    blk("home-contact", "contact", {
      heading: "Get in touch",
      intro: "<p>Questions about the fair, registration, or logistics? Email is the fastest way to reach us.</p>",
      email: EMAIL,
      phone: "(979) 847-8567",
      address: MAILING_ADDRESS,
      people: coChairs,
    }, { tone: "tint" }),
  ],
};

// ──────────────────────────────── Team ────────────────────────────────
export const TEAM_INTRO =
  "<p>The SEC Career Fair is entirely student-run by a dedicated team of engineers from the Student Engineers’ Council.</p>";

export function teamPage(members: Block): Page {
  return {
    id: "team",
    slug: "team",
    title: "Meet the Team",
    description: "Meet the Student Engineers’ Council committee that plans, organizes, and staffs the SEC Engineering Career Fair.",
    layout: "landing",
    blocks: [
      blk("team-header", "pageHeader", {
        eyebrow: "Student Engineers’ Council",
        title: "Meet the Team",
        intro: TEAM_INTRO,
        facts: [],
        links: [],
      }),
      members,
    ],
  };
}

const teamMembers = blk("home-team", "team", {
  heading: "Students running the whole show",
  intro: "",
  members: team,
}, { tone: "maroon" });

// ─────────────────────────────── Students ───────────────────────────────
const students: Page = {
  id: "students",
  slug: "students",
  title: "Student guide",
  description:
    "Everything Texas A&M students need for the 2026 SEC Engineering Career Fair: dates, registration, dress code, shuttle and parking, company search, the virtual fair, and FAQs.",
  layout: "guide",
  blocks: [
    blk("stu-header", "pageHeader", {
      eyebrow: "Students · Fall 2026",
      title: "Everything you need for fair day",
      intro: "<p>Current students don’t need to register. Bring your A&amp;M ID, dress professionally, and plan which of the 500+ companies you want to meet.</p>",
      facts: [
        { label: "Fair days", value: "Wed–Thu, Sep 9–10 · 9 AM – 5 PM" },
        { label: "Location", value: "Legends Event Center, Bryan" },
        { label: "Getting there", value: "Free shuttle from Zachry, every 7–10 min" },
        { label: "Virtual fair", value: "Fri, Sep 11 · HireAggies" },
      ],
      links: [
        { label: "Search companies", href: "https://tamu-csm.symplicity.com/students/app/career-fairs/b35a231b6bedd62b18e97cad9c8babb3/overview" },
        { label: "Shuttle & parking", href: "#getting-there" },
        { label: "Dress code", href: "#dress-code" },
      ],
    }),
    blk("dates", "schedule", {
      heading: "Dates & times",
      intro: "",
      rows: [
        { date: "Tuesday, Sep 8", event: "Company Chat", time: "12:00 PM – 4:00 PM", location: "ConocoPhillips Atrium & Virginia Brown Atrium", href: "#company-chat" },
        { date: "Tuesday, Sep 8", event: "Welcome Social", time: "7:30 PM – 9:30 PM", location: "Zone Club at Kyle Field", href: "#welcome-social" },
        { date: "Wednesday, Sep 9", event: "In-Person Career Fair — Day 1", time: "9:00 AM – 5:00 PM", location: "Legends Event Center", href: LEGENDS_MAP },
        { date: "Thursday, Sep 10", event: "In-Person Career Fair — Day 2", time: "9:00 AM – 5:00 PM", location: "Legends Event Center", href: LEGENDS_MAP },
        { date: "Friday, Sep 11", event: "Virtual Career Fair", time: "9:00 AM – 5:00 PM", location: "Symplicity (HireAggies)", href: "#virtual-fair" },
      ],
      note: "<p><strong>Who can attend:</strong> all current or former Texas A&amp;M University students and TAMU System students may attend the in-person and virtual career fairs.</p>",
    }, { nav: "Dates & times", group: "Plan ahead" }),
    blk("registration", "cards", {
      heading: "Registration",
      intro: "<p>Current Texas A&amp;M students do not need to pre-register for the in-person career fair.</p>",
      items: [
        {
          title: "Current students",
          body: "<ul><li>No pre-registration for the in-person fair (Sep 9–10)</li><li>Present your A&amp;M student ID at the door</li><li>Business casual is required; business professional is recommended</li><li>For the virtual fair (Sep 11), RSVP on HireAggies — <a href=\"#virtual-students\">see the steps</a></li></ul>",
          image: noImg,
        },
        {
          title: "Former students (alumni)",
          body: "<p><strong>In person:</strong> bring proof of prior enrollment — a past student ID, your Aggie Ring, or similar.</p><p><strong>Virtual:</strong> you’ll need a free @aggienetwork.com email to RSVP on HireAggies. <a href=\"#virtual-alumni\">See the alumni steps</a>.</p>",
          image: noImg,
        },
        {
          title: "Sister institutions",
          body: "<p>Students from TAMUCC, TAMU Galveston, and other TAMU System campuses are welcome at the in-person fair with a valid student ID.</p><p>For virtual fair access, email <a href=\"mailto:careerfair@sec.tamu.edu\">careerfair@sec.tamu.edu</a> for help with HireAggies registration.</p>",
          image: noImg,
        },
      ],
      note: "",
    }, { nav: "Registration", group: "Plan ahead" }),
    blk("pre-fair-week", "timeline", {
      heading: "Pre-Career Fair Week",
      intro: "<p>Hosted by the Student Engineers’ Council from August 24 to September 4 to get you ready for the fair. <strong>Free food at every event, no registration required, and the dress code is casual.</strong> SEC members table throughout the week to answer questions.</p>",
      days: [
        {
          title: "Week 1 — Tabling",
          meta: "August 24–27",
          entries: [
            { time: "Mon, Aug 24 · 9 AM – 12 PM", title: "Donut Day", detail: "<p>ConocoPhillips Atrium. Free donuts on the first day of school — bring your fair questions.</p>" },
            { time: "Tue, Aug 25 · 9 AM – 12 PM", title: "Tabling", detail: "<p>ConocoPhillips Atrium. Ask questions and pick up resources for the week.</p>" },
            { time: "Wed, Aug 26 · 11 AM – 2 PM", title: "Snow Cone Day", detail: "<p>E-Quad. Free snow cones.</p>" },
            { time: "Thu, Aug 27 · 9 AM – 12 PM", title: "Cookies & Career Fair", detail: "<p>ConocoPhillips Atrium. Answers about fair rules, company search, and venue logistics.</p>" },
          ],
        },
        {
          title: "Week 2 — Workshops",
          meta: "August 31 – September 4",
          entries: [
            { time: "Mon, Aug 31 · 5:30 – 6:30 PM", title: "Resume Workshop", detail: "<p>Chevron Rooms. The do’s and don’ts of an effective resume.</p>" },
            { time: "Tue, Sep 1 · 5:30 – 6:30 PM", title: "Elevator Pitch Workshop", detail: "<p>WEB 232. Deliver a confident pitch and make a lasting impression.</p>" },
            { time: "Wed, Sep 2 · 5:30 – 6:30 PM", title: "LinkedIn Workshop", detail: "<p>WEB 232. Build a profile that stands out to recruiters.</p>" },
            { time: "Thu, Sep 3 · 5:30 – 6:30 PM", title: "Student Panel", detail: "<p>WEB 232. Hear how other students prepare and make the most of fair day.</p>" },
            { time: "Fri, Sep 4 · 9 AM – 12 PM", title: "Career Fair office hours", detail: "<p>ConocoPhillips Atrium. Drop in for last-minute questions or resources.</p>" },
          ],
        },
      ],
      note: "",
    }, { nav: "Pre-Career Fair Week", group: "Before the fair" }),
    blk("company-chat", "event", {
      heading: "Company Chat",
      body: "<p>Network with top engineering companies in a smaller, more personal setting before the Career Fair. Visit company tables at your own pace and ask about career advice, company culture, and opportunities — with light refreshments.</p>",
      facts: [
        { label: "Date", value: "Tuesday, September 8" },
        { label: "Time", value: "12:00 PM – 4:00 PM" },
        { label: "Location", value: "ConocoPhillips Atrium & Virginia Brown Atrium" },
        { label: "Dress", value: "Casual" },
        { label: "Registration", value: "Not required" },
      ],
      links: [{ label: "View company schedule", href: "https://docs.google.com/spreadsheets/d/1QzFNrbyRoifpGoPdxP4MlSVoCsm4Q1P8xpazv-8AsVM/edit?usp=sharing" }],
      note: "",
      gallery: companyChatPhotos,
    }, { nav: "Company Chat", group: "Before the fair" }),
    blk("welcome-social", "event", {
      heading: "Welcome Social",
      body: "<p>A reception-style evening to meet recruiters from prominent companies in your discipline. Leave your backpack and resume at home and come ready to learn about industries and opportunities — with complimentary refreshments.</p><p><strong>This isn’t a career fair:</strong> skip the lines and keep conversations free-flowing. Paid parking is available at University Center Garage (near Koldus), Gene Stallings Garage, and West Campus Garage.</p>",
      facts: [
        { label: "Date", value: "Tuesday, September 8" },
        { label: "Time", value: "7:30 PM – 9:30 PM" },
        { label: "Location", value: "Zone Club at Kyle Field" },
        { label: "Dress", value: "Business casual" },
        { label: "Registration", value: "Not required" },
      ],
      links: [{ label: "View company list", href: "https://www.canva.com/design/DAHTnqEfU_w/mnvs55tQyoW9MSuG_lH7lQ/view" }],
      note: "",
      gallery: welcomeSocialPhotos,
    }, { nav: "Welcome Social", group: "Before the fair" }),
    blk("itinerary", "timeline", {
      heading: "Fair itinerary",
      intro: "<p>Company Chat and the Welcome Social happen the day before, on Tuesday, September 8. See <a href=\"#company-chat\">Company Chat</a> and <a href=\"#welcome-social\">Welcome Social</a>.</p>",
      days: [
        {
          title: "In-person fair · Day 1",
          meta: "Wednesday, September 9 · Legends Event Center",
          entries: [
            { time: "7:30 AM – 6:30 PM", title: "Free shuttle from Zachry", detail: "<p>Every 7–10 minutes. <a href=\"#getting-there\">Route &amp; parking</a></p>" },
            { time: "9:00 AM – 5:00 PM", title: "Exhibition", detail: "<p>Bring your A&amp;M ID and dress professionally.</p>" },
          ],
        },
        {
          title: "In-person fair · Day 2",
          meta: "Thursday, September 10 · Legends Event Center",
          entries: [
            { time: "7:30 AM – 6:30 PM", title: "Free shuttle from Zachry", detail: "<p>Every 7–10 minutes. <a href=\"#getting-there\">Route &amp; parking</a></p>" },
            { time: "9:00 AM – 5:00 PM", title: "Exhibition", detail: "<p>Bring your A&amp;M ID and dress professionally.</p>" },
          ],
        },
        {
          title: "Virtual fair",
          meta: "Friday, September 11 · HireAggies",
          entries: [
            { time: "9:00 AM – 5:00 PM", title: "Virtual Career Fair", detail: "<p>RSVP on HireAggies beforehand. <a href=\"#virtual-students\">How to register</a></p>" },
          ],
        },
      ],
      note: "",
    }, { nav: "Itinerary", group: "Fair day" }),
    blk("dress-code", "cards", {
      heading: "Dress code",
      intro: "<p><strong>Professional attire is required for entry.</strong> Attendees represent Texas A&amp;M as a whole; students who do not follow these guidelines will not be admitted to the in-person fair.</p>",
      items: [
        {
          title: "Required attire",
          body: "<p><strong>Recommended:</strong> dress pants, dress shoes, and a suit (or jacket/blazer).</p><p><strong>Not allowed:</strong> denim, prohibited footwear, or a non-collared shirt (men).</p>",
          image: img("/images/fair/dress-required.webp", "Dress code graphic: recommended attire is dress pants, dress shoes, and a suit or blazer. Denim, prohibited footwear, and non-collared shirts are not allowed."),
        },
        {
          title: "Prohibited footwear",
          body: "<p>You will be denied entry if wearing:</p><ul><li>Sandals — open- or closed-toe</li><li>Bright sneakers — anything not neutral-colored</li><li>Patterned sneakers</li></ul>",
          image: img("/images/fair/dress-prohibited-footwear.webp", "Prohibited footwear graphic: sandals, bright sneakers, and patterned sneakers."),
        },
        {
          title: "Recommended footwear",
          body: "<ul><li>Men: neutral dress shoes (black or brown)</li><li>Women: closed-toe dress shoes</li></ul><p>Don’t own a pair? Check the <a href=\"#career-closet\">Career Closet</a>.</p>",
          image: img("/images/fair/dress-recommended-footwear.webp", "Recommended footwear graphic: neutral dress shoes for men, closed-toe dress shoes for women."),
        },
        {
          title: "Allowed, though not recommended",
          body: "<ul><li>Closed-toe, neutral cowboy boots</li><li>Closed-toe, neutral ankle boots (e.g. Doc Martens)</li><li>Non-patterned sneakers in white, black, gray, tan, or brown</li></ul><p>Updated since 2025.</p>",
          image: img("/images/fair/dress-allowed-footwear.webp", "Allowed footwear graphic: neutral cowboy boots, ankle boots, and neutral non-patterned sneakers."),
        },
      ],
      note: "<p><strong>Don’t own a suit?</strong> Borrow one from the <a href=\"#career-closet\">Texas A&amp;M Career Closet</a>, including at its pop-up before the fair.</p>",
    }, { nav: "Dress code", group: "Fair day" }),
    blk("career-closet", "event", {
      heading: "Career Closet",
      body: "<p>Need a suit for the fair? The Texas A&amp;M Career Closet lends professional attire to current Texas A&amp;M students, with suits for men and women (skirt or pant options). It’s run by student volunteers, and no appointment is needed.</p><p>Before the fair, the Career Closet sets up a <strong>pop-up in the ConocoPhillips Atrium</strong>, steps from the engineering buildings, so you can find an outfit without a trip to the MSC.</p>",
      facts: [
        { label: "Fair pop-up dates", value: "Wednesday–Thursday, September 2–3" },
        { label: "Pop-up hours", value: "10:00 AM – 4:00 PM" },
        { label: "Pop-up location", value: "ConocoPhillips Atrium" },
        { label: "Year-round location", value: "MSC L428 · Mondays & Thursdays, 10 AM – 4 PM" },
        { label: "Cost", value: "Free to borrow · $5 subsidized dry cleaning" },
        { label: "Who can borrow", value: "Current Texas A&M students" },
      ],
      links: [
        { label: "Career Closet website", href: "https://careercloset.tamu.edu/" },
        { label: "Career Closet FAQs", href: "https://careercloset.tamu.edu/faqs/" },
      ],
      note: "",
      gallery: [],
    }, { nav: "Career Closet", group: "Fair day" }),
    blk("career-closet-steps", "steps", {
      heading: "How borrowing works",
      intro: "<p>The Career Closet’s standard checkout policy. Suits are donated, so some sizes may be limited; arrive early for the best selection.</p>",
      steps: [
        { title: "Drop in", body: "<p>No reservation needed. Help is first come, first served, and the closet fits no more than two people at a time.</p>" },
        { title: "Try on and check out", body: "<p><strong>Women:</strong> skirts and blazers in sizes 2–22W, pants 2–18.</p><p><strong>Men:</strong> pants 30x30–38x32, jackets 36S–52L.</p>" },
        { title: "Wear it for one week", body: "<p>Checkout lasts one week, including dry cleaning. Need longer? Email <a href=\"mailto:operations.tamucareercloset@gmail.com\">operations.tamucareercloset@gmail.com</a> before checkout with the subject “Extended Check-Out: (Name)”, your UIN, and the reason.</p>" },
        { title: "Clean and return", body: "<p>Take the suit to Park Cleaners (314 George Bush Dr.) with the $5 voucher you get at checkout, then return it with the receipt to MSC L428 during open hours.</p>" },
      ],
      links: [{ label: "Email the Career Closet", href: "mailto:careercloset.tamu@gmail.com" }],
    }, { group: "Fair day" }),
    blk("career-closet-terms", "callout", {
      tone: "info",
      body: "<p><strong>Good to know:</strong> you’re responsible for up to $100 if a suit is lost or badly damaged, and not returning it can place holds on your HireAggies and Student Business Services accounts. The closet is volunteer-run and generally open during the fall and spring semesters; check its website for current dates.</p>",
    }, { group: "Fair day" }),
    blk("getting-there", "cards", {
      heading: "Getting there",
      intro: "<p>Legends Event Center is off campus in Bryan. <strong>The free shuttle is the fastest option</strong> — rideshare is not recommended because of surge pricing during fair hours.</p>",
      items: [
        {
          title: "Free bus shuttle (recommended)",
          body: "<p>Charter buses run continuously between Wisenbaker Engineering Building (Zachry) and Legends Event Center on both in-person days.</p><ul><li>Every 7–10 minutes</li><li>7:30 AM – 6:30 PM, Sep 9–10</li></ul>",
          image: img("/images/fair/student-shuttle-route.webp", "Map of the shuttle route between Zachry and Legends Event Center"),
        },
        {
          title: "Student parking",
          body: "<p>About 1,000–1,200 spaces at and near Legends Event Center. Staff will direct you to open lots: Legends Event Center, D-Bat, TopGolf, Travis Fields, and Schulman’s Movie Bowl Grille.</p><p>Some D-Bat and TopGolf spots are reserved. Shuttles also run from lots farther from the venue.</p>",
          image: img("/images/fair/student-parking.webp", "Map of student parking lots near Legends Event Center"),
        },
      ],
      note: "",
    }, { nav: "Shuttle & parking", group: "Fair day" }),
    blk("company-search", "event", {
      heading: "Company search & booth map",
      body: "<p>Plan who you want to meet before you arrive. Search attending companies on HireAggies, check booth assignments, and study the Legends Event Center floor plan.</p>",
      facts: [],
      links: [
        { label: "Search companies on HireAggies", href: "https://tamu-csm.symplicity.com/students/app/career-fairs/b35a231b6bedd62b18e97cad9c8babb3/overview" },
        { label: "Company list & booth placement", href: "https://docs.google.com/spreadsheets/d/1vImC9v2qjZfV_Gms66VwqGA84zqw64nSc8eY_VY1gzQ/edit?usp=sharing" },
      ],
      note: "",
      gallery: [img("/images/fair/booth-map.webp", "Legends Event Center booth map")],
    }, { nav: "Company search", group: "Fair day" }),
    blk("headshots", "text", {
      heading: "Professional headshots",
      body: "<p>Complimentary professional headshots are taken during the fair at Legends Event Center (West End). Photos are available to download about 10 days after the fair and remain available through November 16.</p><p><a href=\"https://www.specialphoto.com/career-fairs/\">Open the headshot gallery</a></p>",
    }, { nav: "Headshots", group: "Fair day" }),
    blk("virtual-fair", "event", {
      heading: "Virtual Career Fair",
      body: "<p>Meet leading employers from anywhere — live sessions, one-on-one recruiter chats, and on-the-spot interviews — hosted on HireAggies (Symplicity).</p>",
      facts: [
        { label: "When", value: "Friday, September 11 · 9 AM – 5 PM CST" },
        { label: "Where", value: "HireAggies (Symplicity)" },
        { label: "RSVP", value: "Opens on HireAggies closer to the fair" },
      ],
      links: [
        { label: "Watch the platform tutorial", href: "https://vimeo.com/446651089/4423ceafb4" },
        { label: "Reserve a Career Center interview room", href: "http://tx.ag/ccroomrequest" },
      ],
      note: "<p><strong>Need a quiet space?</strong> The Career Center (209 Koldus) offers professional interview rooms during the fair. Bring your own device or use an on-site desktop. Rooms are limited — reserve early.</p>",
      gallery: [],
    }, { nav: "Virtual fair", group: "Virtual fair" }),
    blk("virtual-students", "steps", {
      heading: "Current Student Registration",
      intro: "<p>RSVP through HireAggies using your @tamu.edu email.</p>",
      steps: [
        { title: "Log in to HireAggies", body: "<p>Go to <a href=\"https://tamu-csm.symplicity.com/students\">tamu-csm.symplicity.com</a> and sign in with your @tamu.edu email.</p>" },
        { title: "Find the virtual career fair", body: "<p>Open Career Fairs and search for “SEC Engineering Career Fair — Fall 2026 Virtual.”</p>" },
        { title: "RSVP and browse companies", body: "<p>Click RSVP, then browse attending companies and schedule one-on-one sessions with recruiters.</p>" },
      ],
      links: [{ label: "Go to HireAggies", href: HIREAGGIES_STUDENTS }],
    }, { nav: "Current student registration", group: "Virtual fair" }),
    blk("virtual-alumni", "steps", {
      heading: "Alumni Registration",
      intro: "<p>Former students no longer have a @tamu.edu email. Create a free @aggienetwork.com address to register.</p>",
      steps: [
        { title: "Create an Aggie Network account", body: "<p>Visit <a href=\"https://www.aggienetwork.com/register/\">aggienetwork.com/register</a>. Enter your name and class year, verify with your UIN or contact email, then select your name.</p>" },
        { title: "Create an @aggienetwork.com email", body: "<p>Visit <a href=\"http://tx.ag/myemail\">tx.ag/myemail</a>, sign in, and choose a username.</p>" },
        { title: "RSVP on HireAggies", body: "<p>Log in to HireAggies with your new address and RSVP to the virtual fair.</p>" },
      ],
      links: [],
    }, { nav: "Alumni registration", group: "Virtual fair" }),
    blk("preparation", "links", {
      heading: "Preparation materials",
      intro: "<p>Short on time? Watch the prep video, then come to a Pre-Career Fair Week workshop.</p>",
      groups: [
        { title: "Watch", links: [{ label: "Career fair prep video (Texas A&M Career Center)", href: "https://drive.google.com/file/d/1dCHZRiS_J6TnoeFr_oaeVHKA25R1BmzZ/view?usp=share_link" }, { label: "HireAggies tip videos on YouTube", href: "https://www.youtube.com/user/HireAggies/videos" }] },
        { title: "Career Center", links: [{ label: "Career Center website", href: "https://careercenter.tamu.edu/" }] },
        { title: "On this site", links: [{ label: "Dress code", href: "#dress-code" }, { label: "Pre-Career Fair Week workshops", href: "#pre-fair-week" }] },
      ],
    }, { nav: "Preparation", group: "Prepare & get help" }),
    blk("faqs", "faq", {
      heading: "Frequently asked questions",
      intro: "",
      groups: [
        {
          title: "Registration",
          items: [
            { q: "I’m a current student. How do I sign up?", a: "<p>You don’t need to register for the in-person fair — bring your A&amp;M ID. For the virtual fair, log in to <a href=\"https://tamu-csm.symplicity.com/students\">HireAggies</a> to RSVP.</p>" },
            { q: "Can I attend if I go to a sister institution?", a: "<p>Yes. Attend in person with proof of enrollment (your student ID). For virtual access, email <a href=\"mailto:careerfair@sec.tamu.edu\">careerfair@sec.tamu.edu</a>.</p>" },
            { q: "Can I attend as an alumnus?", a: "<p>Yes. Bring proof of prior Texas A&amp;M enrollment, such as a student ID or Aggie Ring. For the virtual fair, follow the <a href=\"#virtual-alumni\">alumni registration steps</a>.</p>" },
          ],
        },
        {
          title: "Preparation",
          items: [
            { q: "What can I do now to prepare?", a: "<p>Review the <a href=\"#preparation\">preparation materials</a> and attend the <a href=\"#pre-fair-week\">Pre-Career Fair Week</a> workshops.</p>" },
            { q: "What should I wear?", a: "<p>Business casual is required; business professional is recommended for both the in-person and virtual fairs. See the <a href=\"#dress-code\">dress code</a>. Don’t own a suit? Borrow one from the <a href=\"#career-closet\">Career Closet</a>.</p>" },
          ],
        },
        {
          title: "In-person fair",
          items: [
            { q: "How do I get to Legends Event Center?", a: "<p>Take the free shuttle from Wisenbaker Engineering Building (Zachry). Buses run every 7–10 minutes, 7:30 AM – 6:30 PM on September 9–10. See <a href=\"#getting-there\">shuttle &amp; parking</a>.</p>" },
            { q: "Where are the company list and booth map?", a: "<p>See <a href=\"#company-search\">company search &amp; booth map</a>.</p>" },
            { q: "Where is lost and found?", a: "<p>At the help desk on the 4th floor of the Zachry Engineering Education Complex.</p>" },
            { q: "Where can I find my headshots?", a: "<p>Photos are available about 10 days after the fair through November 16. See <a href=\"#headshots\">headshots</a>.</p>" },
          ],
        },
        {
          title: "Virtual fair",
          items: [
            { q: "What platform is the virtual fair on?", a: "<p>The <a href=\"https://tamu-csm.symplicity.com/students/app/career-fairs/15733a175a1d6d6c22816b4e45cdcb8c/overview\">HireAggies (Symplicity) virtual career fair platform</a>.</p>" },
            { q: "Is there a place on campus for virtual interviews?", a: "<p>Yes. The Career Center (209 Koldus) offers quiet interview rooms. <a href=\"http://tx.ag/ccroomrequest\">Submit a request</a> and the Career Center will confirm availability.</p>" },
          ],
        },
      ],
    }, { nav: "FAQs", group: "Prepare & get help" }),
    blk("stu-contact", "contact", {
      heading: "Contact us",
      intro: "<p>Email is the best way to reach us. Phone availability is limited — set up a time by email first.</p>",
      email: EMAIL,
      phone: "Zachry 450E · (979) 847-8567",
      address: MAILING_ADDRESS,
      people: coChairs,
    }, { nav: "Contact", group: "Prepare & get help", tone: "tint" }),
  ],
};

// ────────────────────────────── Recruiters ──────────────────────────────
const recruiters: Page = {
  id: "recruiters",
  slug: "recruiters",
  title: "Recruiter guide",
  description:
    "Registration, pricing, itinerary, parking, booth and shipping logistics, the virtual fair, and hotels for recruiters attending the 2026 SEC Engineering Career Fair.",
  layout: "guide",
  blocks: [
    blk("rec-header", "pageHeader", {
      eyebrow: "Recruiters · Fall 2026",
      title: "Plan your company’s visit",
      intro: "<p>Meet 12,000+ Aggie engineers seeking internships, co-ops, and full-time roles at the largest student-run career fair in the nation.</p>",
      facts: [
        { label: "Registration closes", value: "Thu, Aug 21 · 11:59 PM CST" },
        { label: "Ship booth materials by", value: "Mon, Sep 7 · Legends Event Center" },
        { label: "Fair days", value: "Wed–Thu, Sep 9–10 · 9 AM – 5 PM" },
        { label: "Payment due", value: "Fri, Sep 11 · $50 late fee after" },
      ],
      links: [
        { label: "Register on Symplicity", href: SYMPLICITY_EMPLOYERS },
        { label: "Request a quote", href: "mailto:careerfair@sec.tamu.edu?subject=Career%20Fair%20Quote%20%5BCOMPANY%20NAME%5D" },
        { label: "Booth & shipping", href: "#booth-shipping" },
      ],
    }),
    blk("rec-dates", "schedule", {
      heading: "Dates & times",
      intro: "",
      rows: [
        { date: "Tuesday, Sep 8", event: "Company Chat", time: "TBD", location: "TBD", href: "#pre-fair-events" },
        { date: "Tuesday, Sep 8", event: "Welcome Social", time: "TBD", location: "TBD", href: "#welcome-social" },
        { date: "Wednesday, Sep 9", event: "In-Person Career Fair — Day 1", time: "9:00 AM – 5:00 PM", location: "Legends Event Center", href: LEGENDS_MAP },
        { date: "Thursday, Sep 10", event: "In-Person Career Fair — Day 2", time: "9:00 AM – 5:00 PM", location: "Legends Event Center", href: LEGENDS_MAP },
        { date: "Friday, Sep 11", event: "Virtual Career Fair", time: "9:00 AM – 5:00 PM", location: "Symplicity (HireAggies)", href: "#virtual-fair" },
      ],
      note: "",
    }, { nav: "Dates & times", group: "Register" }),
    blk("registration", "steps", {
      heading: "How to register",
      intro: "<p>All registrations are handled through HireAggies (Symplicity). Registration opens <strong>Wednesday, May 6 at 8:00 AM CST</strong> and closes <strong>Thursday, August 21 at 11:59 PM CST</strong>.</p>",
      steps: [
        { title: "Create a Symplicity account", body: "<p>Create an account at <a href=\"https://tamu-csm.symplicity.com/employers/index.php?signin_tab=0\">tamu-csm.symplicity.com</a>. Allow 2–3 business days for vetting and approval.</p>" },
        { title: "Register for the Fall 2026 fair", body: "<p>Once approved, log in and find “SEC Engineering Career Fair — Fall 2026.”</p>" },
        { title: "Select your package & booth", body: "<p>Choose your booth package. To join Company Chat or the Welcome Social, select them on the registration form. Booth assignments are reviewed holistically after registration closes.</p>" },
        { title: "Complete payment", body: "<p>Pay by credit card online or by mailed check. <a href=\"#payment\">Payment details</a>.</p>" },
      ],
      links: [
        { label: "Create / log in to Symplicity", href: SYMPLICITY_EMPLOYERS },
        { label: "Preview the event on HireAggies", href: "https://tamu-csm.symplicity.com/events/upcoming" },
      ],
    }, { nav: "Registration", group: "Register" }),
    blk("pricing", "text", {
      heading: "Pricing",
      body: "<p>Email us with your company name and we’ll send a complete package quote.</p><p><a href=\"mailto:careerfair@sec.tamu.edu?subject=Career%20Fair%20Quote%20%5BCOMPANY%20NAME%5D\">Request a quote</a> — subject line: “Career Fair Quote [COMPANY NAME]”.</p>",
    }, { nav: "Pricing", group: "Register" }),
    blk("payment", "cards", {
      heading: "Payment",
      intro: "<p><strong>Payment is due September 11</strong>, after which a $50 late fee applies. For invoice discrepancies, email <a href=\"mailto:careerfair@sec.tamu.edu?subject=Invoice%20Discrepancies%20%5BCOMPANY%20NAME%5D\">careerfair@sec.tamu.edu</a>.</p>",
      items: [
        { title: "Credit card", body: "<p>Accepted online up to one week after the Career Fair.</p><p><a href=\"https://sofctamu.estore.flywire.com/products/engineering-career-fair-invoice-spring-2026--copy-428753\">Pay by credit card</a></p>", image: noImg },
        { title: "Check or money order", body: "<p>Company, personal, and cashier’s checks and money orders are accepted. Mail to:</p><p>Student Engineers’ Council<br>ATTN: Career Fair<br>3127 Texas A&amp;M University (TAMU)<br>College Station, TX 77843-3127</p>", image: noImg },
        { title: "Finding your invoice", body: "<ol><li>View your registration on <a href=\"https://tamu-csm.symplicity.com/events\">Symplicity</a>.</li><li>Click “Registered” next to the event.</li><li>Open the “Accounting” tab.</li></ol>", image: noImg },
        { title: "Tax ID & W-9", body: "<p>SEC’s Tax ID Number is <strong>74-2982563</strong>.</p><p>For official documentation or a W-9, email <a href=\"mailto:careerfair@sec.tamu.edu?subject=W-9%20Form%20%5BCOMPANY%20NAME%5D\">careerfair@sec.tamu.edu</a> with the subject “W-9 Form [COMPANY NAME]”.</p>", image: noImg },
      ],
      note: "",
    }, { nav: "Payment & tax ID", group: "Register" }),
    blk("refunds", "table", {
      heading: "Withdrawal & refund policy",
      intro: "",
      columns: ["Withdrawal date", "Refund"],
      rows: [
        { cells: ["Before July 31", "100% refund"] },
        { cells: ["August 1 – August 25", "50% refund"] },
        { cells: ["After August 26", "No refund"] },
      ],
      note: "<p>As a non-profit student organization, we cannot process direct refunds. If you’ve already paid and withdraw, you’ll receive credit toward a future fair according to this table. Questions: <a href=\"mailto:careerfair@sec.tamu.edu?subject=Refund%20Policy%20Inquiry%20%5BCOMPANY%20NAME%5D\">careerfair@sec.tamu.edu</a>.</p>",
    }, { nav: "Withdrawals & refunds", group: "Register" }),
    blk("pre-fair-events", "event", {
      heading: "Company Chat",
      body: "<p>Each company receives a dedicated 2- or 4-hour time slot for open networking, so students can ask questions and build connections before the Career Fair.</p><p><strong>How to participate:</strong> select Company Chat on your fair registration form. Coordinators will follow up with confirmed details and your time slot.</p>",
      facts: [
        { label: "Date", value: "Tuesday, September 8" },
        { label: "Time", value: "TBD" },
        { label: "Location", value: "TBD" },
        { label: "Format", value: "Open networking" },
        { label: "Registration", value: "Select Company Chat on your fair registration form" },
      ],
      links: [],
      note: "",
      gallery: companyChatPhotos,
    }, { nav: "Company Chat", group: "Pre-fair events" }),
    blk("welcome-social", "event", {
      heading: "Welcome Social",
      body: "<p>A less formal but professional evening: a recruiter-only dinner, then reception-style networking with outstanding Aggie engineering students over dessert. Detailed timing will be shared closer to the event.</p><p><strong>How to participate:</strong> select Welcome Social on your fair registration form, and coordinators will follow up with details. It’s a reception, so please skip formal setups and presentation tables.</p>",
      facts: [
        { label: "Date", value: "Tuesday, September 8" },
        { label: "Time", value: "TBD" },
        { label: "Location", value: "TBD" },
        { label: "Dress", value: "Company polo (students wear business casual)" },
        { label: "Registration", value: "Select Welcome Social on your fair registration form" },
      ],
      links: [],
      note: "",
      gallery: welcomeSocialPhotos,
    }, { nav: "Welcome Social", group: "Pre-fair events" }),
    blk("rec-itinerary", "timeline", {
      heading: "Fair itinerary",
      intro: "",
      days: [
        {
          title: "Early check-in",
          meta: "Tuesday, September 8 · Legends Event Center",
          entries: [
            { time: "2:00 PM – 5:00 PM", title: "Recruiter check-in", detail: "<p>Pick up your badge and booth materials and set up before fair day.</p>" },
          ],
        },
        {
          title: "In-person fair · Day 1",
          meta: "Wednesday, September 9 · Legends Event Center",
          entries: [
            { time: "7:00 AM – 9:00 AM", title: "Check-in & complimentary breakfast", detail: "<p>Finalize booth setup; breakfast is served in the recruiter lounge.</p>" },
            { time: "9:00 AM – 5:00 PM", title: "Exhibition", detail: "<p>12,000+ engineering students seeking internships, co-ops, and full-time roles.</p>" },
            { time: "11:00 AM – 2:00 PM", title: "Complimentary hot lunch", detail: "<p>In the recruiter lounge. Representatives may take turns stepping away.</p>" },
          ],
        },
        {
          title: "In-person fair · Day 2",
          meta: "Thursday, September 10 · Legends Event Center",
          entries: [
            { time: "7:00 AM – 9:00 AM", title: "Check-in & complimentary breakfast", detail: "" },
            { time: "9:00 AM – 5:00 PM", title: "Exhibition", detail: "" },
            { time: "11:00 AM – 2:00 PM", title: "Complimentary hot lunch", detail: "" },
          ],
        },
      ],
      note: "<p>A detailed booth map and final logistics packet will be emailed to all registered companies before the fair.</p>",
    }, { nav: "Itinerary", group: "Fair days" }),
    blk("parking", "cards", {
      heading: "Parking",
      intro: "",
      items: [
        {
          title: "General recruiter parking",
          body: "<p><strong>Fan Field Parking Lot</strong> — Research Parkway, across from Lot 111. A dedicated shuttle runs to Legends Event Center about every 10 minutes, 6:30 AM – 6:30 PM both fair days.</p>",
          image: img("/images/fair/recruiter-parking.webp", "Map of Fan Field recruiter parking and shuttle route"),
        },
        {
          title: "Maroon sponsor parking",
          body: "<p>Maroon Level Sponsors receive reserved parking at Legends Event Center. Display your printed Maroon Sponsor Parking Placard and <strong>arrive by 10:00 AM</strong>, or you’ll be redirected to general parking.</p><p>Temporary placards are available at the Help Desk the morning of the event.</p>",
          image: img("/images/fair/maroon-sponsor-parking.webp", "Map of Maroon sponsor parking at Legends Event Center"),
        },
      ],
      note: "",
    }, { nav: "Parking", group: "Fair days" }),
    blk("booth-shipping", "cards", {
      heading: "Booth & shipping",
      intro: "<p>Review booth specs and shipping so your materials are waiting when you arrive.</p>",
      items: [
        {
          title: "Booth specifications",
          body: "<ul><li><strong>Size:</strong> 8′ wide × 6′ deep</li><li><strong>Included:</strong> one 6′ × 30″ draped table and two chairs</li><li><strong>Power:</strong> if you pre-purchased electrical access, bring an extension cord (20 ft recommended)</li><li><strong>Staffing:</strong> up to five representatives per booth</li></ul>",
          image: img("/images/fair/booth-map.webp", "Legends Event Center booth map"),
        },
        {
          title: "Inbound shipping",
          body: "<p>Plan for delivery by <strong>Monday, September 7</strong>. Your company name must be on the label; boxes will be waiting at your booth.</p><p>Legends Event Center<br>ATTN: SEC Career Fair – [Company Name]<br>2533 Midtown Park Blvd<br>Bryan, TX 77801</p>",
          image: noImg,
        },
        {
          title: "Outbound shipping",
          body: "<ul><li>Bring your own pre-printed return labels</li><li>Schedule carrier pickup for <strong>Monday, September 14</strong></li><li>Legends holds packages for a maximum of two weeks after the event</li></ul>",
          image: noImg,
        },
      ],
      note: "",
    }, { nav: "Booth & shipping", group: "Fair days" }),
    blk("interviews", "cards", {
      heading: "Interview rooms & job postings",
      intro: "",
      items: [
        { title: "Interview rooms", body: "<p>Reserve through the <a href=\"https://careercenter.tamu.edu/employers\">Texas A&amp;M Career Center</a> (separate from SEC). Log in and select “Create New Schedule Request,” or call (979) 845-5139. Rooms are first-come, first-served — many companies book the days after the fair, so call early.</p>", image: noImg },
        { title: "Post job openings", body: "<p>Reach active job seekers at Texas A&amp;M on HireAggies — free for registered employers.</p><p><a href=\"https://tamu-csm.symplicity.com/employers\">Post on HireAggies</a></p>", image: noImg },
      ],
      note: "",
    }, { nav: "Interview rooms", group: "Fair days" }),
    blk("virtual-fair", "event", {
      heading: "Virtual Career Fair",
      body: "<p>Connect with top student talent without leaving the office: free for registered companies, no travel, and real-time video and chat on a streamlined platform.</p>",
      facts: [
        { label: "Date", value: "September 11, 2026" },
        { label: "Platform", value: "HireAggies (Symplicity)" },
        { label: "Cost", value: "Free for companies registered for the fair" },
        { label: "Registration", value: "To be announced" },
      ],
      links: [{ label: "Create a HireAggies account", href: "https://tamu-csm.symplicity.com/" }],
      note: "",
      gallery: [],
    }, { nav: "Virtual fair", group: "Virtual fair" }),
    blk("virtual-resources", "links", {
      heading: "Tutorials & tech check",
      intro: "<p>Short Career Center videos, about two minutes each, plus links to test your setup before fair day.</p>",
      groups: [
        {
          title: "Platform tutorials",
          links: [
            { label: "Overview of the platform", href: "https://vimeo.com/446650071/5c4d65c59e" },
            { label: "How to register for the Virtual Career Fair", href: "https://youtu.be/rCFNM23kR2A" },
            { label: "How to access the HireAggies Virtual Career Fair", href: "https://youtu.be/JCRxcOO489M" },
            { label: "How to proactively reach out to students", href: "https://youtu.be/mMeJTwOQYOw" },
            { label: "How to group chat", href: "https://youtu.be/TLDTRgvSihg" },
          ],
        },
        {
          title: "Test your tech",
          links: [
            { label: "Zoom: test audio & video", href: "https://support.zoom.us/hc/en-us/articles/201362283-Testing-computer-or-device-audio" },
            { label: "Microsoft Teams: manage call settings", href: "https://support.microsoft.com/en-us/office/manage-your-call-settings-in-teams-456cb611-3477-496f-b31a-6ab752a7595f" },
          ],
        },
      ],
    }, { nav: "Tutorials & tech check", group: "Virtual fair" }),
    blk("hotels", "table", {
      heading: "Local hotels",
      intro: "<p>Hotels near campus and Legends Event Center. Book early — rooms fill quickly during fair week.</p>",
      columns: ["Hotel", "Phone", "Address"],
      rows: hotels,
      note: "",
    }, { nav: "Hotels", group: "Travel & help" }),
    blk("faqs", "faq", {
      heading: "Frequently asked questions",
      intro: "",
      groups: [
        {
          title: "Registration & accounts",
          items: [
            { q: "How do I create an account?", a: "<p>All registrations go through Symplicity. <a href=\"https://tamu-csm.symplicity.com/employers/index.php?signin_tab=0\">Create an account here</a>; allow 2–3 business days for vetting.</p>" },
            { q: "What is the registration deadline?", a: "<p>For Fall 2026, registration opens May 6, 2026 and closes August 21, 2026.</p>" },
          ],
        },
        {
          title: "Logistics & shipping",
          items: [
            { q: "Where do I send my booth materials?", a: "<p>Ship to arrive at Legends Event Center by Monday, September 7. See <a href=\"#booth-shipping\">booth &amp; shipping</a> for the address.</p>" },
          ],
        },
        {
          title: "Payment & invoicing",
          items: [
            { q: "How do I pay?", a: "<p>By credit card online or mailed check, due September 11 ($50 late fee after). See <a href=\"#payment\">payment</a>.</p>" },
            { q: "Where can I find my invoice?", a: "<p>On <a href=\"https://tamu-csm.symplicity.com/events\">Symplicity</a>, click “Registered” next to the event, then open the “Accounting” tab.</p>" },
            { q: "What is SEC’s Tax ID Number?", a: "<p>74-2982563.</p>" },
            { q: "Where can I find SEC’s W-9?", a: "<p>Email <a href=\"mailto:careerfair@sec.tamu.edu?subject=W-9%20Form%20%5BCOMPANY%20NAME%5D\">careerfair@sec.tamu.edu</a> with the subject “W-9 Form [COMPANY NAME]”.</p>" },
          ],
        },
        {
          title: "Virtual fair",
          items: [
            { q: "When does virtual fair registration open?", a: "<p>Fall 2026 virtual registration will be announced later. <a href=\"https://tamu-csm.symplicity.com/\">Create a Symplicity account</a> now if you don’t have one.</p>" },
            { q: "Is the virtual fair free?", a: "<p>Yes — it’s free for companies registered for the fair.</p>" },
          ],
        },
        {
          title: "Interview rooms",
          items: [
            { q: "How do I reserve a private interview room?", a: "<p>Through the <a href=\"https://careercenter.tamu.edu/employers\">Texas A&amp;M Career Center</a> at (979) 845-5139. Call early — many companies book rooms for the days after the fair.</p>" },
          ],
        },
      ],
    }, { nav: "FAQs", group: "Travel & help" }),
    blk("rec-contact", "contact", {
      heading: "Contact us",
      intro: "<p>Email is the best way to reach us. Phone availability is limited — set up a time by email first. For the Career Discovery Fair, email <a href=\"mailto:engrdevelopment@sec.tamu.edu\">engrdevelopment@sec.tamu.edu</a>.</p>",
      email: EMAIL,
      phone: "Zachry 450E · (979) 847-8567",
      address: MAILING_ADDRESS,
      people: coChairs,
    }, { nav: "Contact", group: "Travel & help", tone: "tint" }),
  ],
};

// ─────────────────────────── Career Discovery Fair ───────────────────────────
const discovery: Page = {
  id: "discovery",
  slug: "career-discovery-fair",
  title: "Career Discovery Fair",
  description:
    "The SEC Engineering Career Discovery Fair introduces 3,000+ first-year engineers to engineering industries. November 17, 2026 at the Texas A&M Hotel and Conference Center.",
  layout: "guide",
  blocks: [
    blk("cdf-header", "pageHeader", {
      eyebrow: "Recruiters · Fall 2026",
      title: "Career Discovery Fair",
      intro: "<p>Meet 3,000+ first-year engineering students as they explore majors and industries. Build your brand early and connect with future talent.</p>",
      facts: [
        { label: "Date", value: "Tue, Nov 17 · 9 AM – 4 PM" },
        { label: "Location", value: "Texas A&M Hotel and Conference Center" },
        { label: "Registration opens", value: "May 18, 2026 · Symplicity" },
        { label: "Cost", value: "Free for companies" },
      ],
      links: [
        { label: "Register on Symplicity", href: SYMPLICITY_EMPLOYERS },
        { label: "Email the team", href: "mailto:engrdevelopment@sec.tamu.edu" },
      ],
    }),
    blk("cdf-about", "text", {
      heading: "About the fair",
      body: "<p>The SEC Engineering Career Discovery Fair is planned, organized, and staffed by the Student Engineers’ Council, and is the newest event aimed at educating freshman engineers on engineering industries.</p><p>It is not primarily a recruiting event, but participating companies can identify talent early, build meaningful connections, offer insights, and grow brand visibility.</p>",
    }, { nav: "About" }),
    blk("cdf-date", "schedule", {
      heading: "Date & time",
      intro: "",
      rows: [
        { date: "Tuesday, Nov 17", event: "Career Discovery Fair", time: "9:00 AM – 4:00 PM", location: "Texas A&M Hotel and Conference Center", href: "https://www.google.com/maps/search/?api=1&query=177+Joe+Routt+Blvd,+College+Station,+TX+77840" },
      ],
      note: "",
    }, { nav: "Date & time" }),
    blk("cdf-register", "steps", {
      heading: "How to register",
      intro: "<p>All registrations are handled through Symplicity (HireAggies). Registration opens <strong>May 18, 2026</strong>.</p>",
      steps: [
        { title: "Create a Symplicity account", body: "<p>Create an account for your organization at <a href=\"https://tamu-csm.symplicity.com/employers/index.php?signin_tab=0\">tamu-csm.symplicity.com</a>. Allow 2–3 business days for approval.</p>" },
        { title: "Register for the Fall 2026 Career Discovery Fair", body: "<p>Once approved, log in and find “SEC Career Discovery Fair (Fall 2026).”</p>" },
      ],
      links: [{ label: "Create / log in to Symplicity", href: SYMPLICITY_EMPLOYERS }],
    }, { nav: "Registration" }),
    blk("cdf-logistics", "cards", {
      heading: "Parking, booth & shipping",
      intro: "",
      items: [
        { title: "Parking", body: "<p>Parking information is being finalized and will be shared closer to the fair.</p>", image: noImg },
        { title: "Booth & shipping", body: "<p>Booth and shipping information is being finalized and will be shared closer to the fair.</p>", image: noImg },
      ],
      note: "",
    }, { nav: "Logistics" }),
    blk("cdf-hotels", "table", {
      heading: "Local hotels",
      intro: "<p>Near campus and the Texas A&amp;M Hotel and Conference Center. Book early.</p>",
      columns: ["Hotel", "Phone", "Address"],
      rows: hotels,
      note: "",
    }, { nav: "Hotels" }),
    blk("cdf-contact", "contact", {
      heading: "Contact us",
      intro: "<p>Email is the best way to reach the Engineering Development team. Phone availability is limited.</p>",
      email: "engrdevelopment@sec.tamu.edu",
      phone: "Zachry 450E · (979) 847-8567",
      address: "<p>Student Engineers’ Council<br>ATTN: Career Discovery Fair<br>3127 Texas A&amp;M University (TAMU)<br>College Station, TX 77843-3127</p>",
      people: [
        { name: "Dreux Larsen ’27", role: "Fall 2026 & Spring 2027 Engineering Development Co-Chair", phone: "(832) 245-3543" },
        { name: "Isabelle Planty ’28", role: "Spring 2026 & Fall 2026 Engineering Development Co-Chair", phone: "(817) 395-8686" },
      ],
    }, { nav: "Contact", tone: "tint" }),
  ],
};

export const defaultContent: SiteContent = {
  version: 3,
  settings: {
    siteName: "SEC Engineering Career Fair",
    nav: [
      { label: "Students", href: "/students" },
      { label: "Recruiters", href: "/recruiters" },
      { label: "Career Discovery Fair", href: "/career-discovery-fair" },
      { label: "Meet the Team", href: "/team" },
      { label: "About SEC", href: "https://home.sec.tamu.edu/" },
    ],
    headerCta: { label: "Contact", href: "/#home-contact" },
    footerNote: "Planned, organized, and staffed by the Student Engineers’ Council at Texas A&M University.",
    contactEmail: EMAIL,
    announcement: "",
  },
  pages: [home, students, recruiters, discovery, teamPage(teamMembers)],
};
