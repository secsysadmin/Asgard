export type Tab = { label: string; title: string; intro: string; items: { heading: string; detail: string }[] };

export const studentTabs: Tab[] = [
  { label: "General", title: "Your next conversation starts here.", intro: "The SEC Engineering Career Fair connects Aggie engineers with internship, co-op, and full-time opportunities.", items: [
    { heading: "September 9–10, 2026", detail: "In-person fair · 9:00 AM–5:00 PM · Legends Event Center, Bryan." },
    { heading: "September 11, 2026", detail: "Virtual Career Fair · 9:00 AM–5:00 PM · HireAggies (Symplicity)." },
    { heading: "Come prepared", detail: "Professional attire is required. Bring résumés, plan your company list, and use the free Zachry-to-Legends shuttle." }
  ]},
  { label: "Pre-Career Fair", title: "Start before fair day.", intro: "Pre-Career Fair Week runs August 24–September 4 with free workshops, tabling, and food.", items: [
    { heading: "Resume Workshop", detail: "Monday, August 31 · 5:30 PM · Chevron Rooms." },
    { heading: "Elevator Pitch + LinkedIn", detail: "September 1–2 · 5:30 PM · WEB 232." },
    { heading: "Student Panel", detail: "Thursday, September 3 · 5:30 PM · WEB 232. Hear how other Aggies approach fair day." }
  ]},
  { label: "FAQs", title: "The details, answered.", intro: "Quick guidance for registration, preparation, in-person logistics, and the virtual fair.", items: [
    { heading: "Who can attend?", detail: "Current and former Texas A&M University students and TAMU System students may attend." },
    { heading: "Where do I find companies?", detail: "Use the company list and booth map before you arrive; plan who you want to meet first." },
    { heading: "Where are headshots?", detail: "Complimentary professional headshots are available at Legends Event Center West End and are released after the fair." }
  ]}
];

export const recruiterTabs: Tab[] = [
  { label: "General", title: "Meet the next generation of engineers.", intro: "The largest student-run career fair in the nation brings 12,000+ Aggie engineers to one place.", items: [
    { heading: "Fair logistics", detail: "September 9–10 · Legends Event Center. Recruiter check-in begins at 7:00 AM; exhibition is 9:00 AM–5:00 PM." },
    { heading: "Your booth", detail: "8′ × 6′ space, one 6′ draped table, two chairs, and up to five representatives per booth." },
    { heading: "Arrival + parking", detail: "General parking is at Fan Field with a dedicated shuttle. Maroon sponsors receive Legends Event Center parking." }
  ]},
  { label: "Pricing + Registration", title: "Register through HireAggies.", intro: "All fair registrations are managed through HireAggies (Symplicity).", items: [
    { heading: "Registration window", detail: "Opens Wednesday, May 6 at 8:00 AM CST and closes Thursday, August 21 at 11:59 PM CST." },
    { heading: "Payment", detail: "Pay online by credit card or submit a check. Payment is due September 11; a $50 late fee applies afterward." },
    { heading: "Need a quote?", detail: "Email careerfair@sec.tamu.edu with your company name for a complete package quote." }
  ]},
  { label: "Pre-Career Fair", title: "Build the relationship early.", intro: "Company Chat and Welcome Social create an easier first conversation before the exhibition floor opens.", items: [
    { heading: "Company Chat", detail: "Tuesday, September 8 · Open networking in a dedicated two- or four-hour time slot." },
    { heading: "Welcome Social", detail: "Tuesday evening · A professional but relaxed reception with dinner, dessert, and student networking." },
    { heading: "How to participate", detail: "Select either event on your registration form; the Career Fair team will confirm your details." }
  ]},
  { label: "Virtual Career Fair", title: "A real conversation, from anywhere.", intro: "Connect with students through real-time video and chat on HireAggies, with no travel required.", items: [
    { heading: "September 11, 2026", detail: "Hosted on HireAggies (Symplicity), 9:00 AM–5:00 PM." },
    { heading: "No travel. No cost.", detail: "A streamlined virtual way to meet candidates without leaving the office." },
    { heading: "Test your tech", detail: "Confirm camera and microphone settings before fair day for a smooth experience." }
  ]},
  { label: "FAQs", title: "Everything in its place.", intro: "Answers for booth shipping, registration, payment, virtual fair access, and interview rooms.", items: [
    { heading: "Shipping", detail: "Plan inbound delivery by Monday, September 7. Label every package with your company name." },
    { heading: "Interview rooms", detail: "Reserve through HireAggies; rooms are first-come, first-served." },
    { heading: "Tax ID + W-9", detail: "SEC's Tax ID is 74-2982563. Email careerfair@sec.tamu.edu for official W-9 documentation." }
  ]}
];
