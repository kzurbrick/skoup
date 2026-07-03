import type { StoredFeedItem } from "@/types/feed";

function daysFromToday(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export const SEED_ITEMS: StoredFeedItem[] = [
  {
    id: "seed-1",
    category: "change",
    title: "EXAMPLE: Swim Practice moved to 5:30 PM Thursday",
    summary:
      "Thursday's swim practice has been rescheduled from 4:30 PM to 5:30 PM. Same pool location.",
    date: daysFromToday(1),
    startTime: "17:30",
    location: "Community Pool",
    sourceExcerpt:
      "Please note: Thursday's swim practice has been moved to 5:30 PM (previously 4:30 PM).",
    confidence: "high",
    status: "new",
    emailSource: {
      subject: "Swim Team Schedule Update",
      sender: "coach@swimteam.org",
      body: "Please note: Thursday's swim practice has been moved to 5:30 PM (previously 4:30 PM).",
    },
  },
  {
    id: "seed-2",
    category: "deadline",
    title: "EXAMPLE: RSVP due Friday for End of Season Party",
    summary:
      "Reply with the number of guests attending the end-of-season celebration.",
    date: daysFromToday(2),
    actionRequired: "RSVP with number of guests by Friday",
    sourceExcerpt:
      "Please RSVP by this Friday for our End of Season Party on June 28th.",
    confidence: "high",
    status: "new",
    emailSource: {
      subject: "End of Season Party – RSVP Needed",
      sender: "pta@school.edu",
      body: "Please RSVP by this Friday for our End of Season Party on June 28th.",
    },
  },
  {
    id: "seed-3",
    category: "action",
    title: "EXAMPLE: Volunteer signup needed for concessions",
    summary:
      "The team needs parent volunteers to help run the concession stand at Saturday's game.",
    actionRequired: "Sign up for a concession shift",
    sourceExcerpt:
      "We're still short on concession volunteers for Saturday's game. Please sign up if you can help!",
    confidence: "high",
    status: "new",
    emailSource: {
      subject: "Volunteers Needed – Saturday Game",
      sender: "volunteers@sports.org",
      body: "We're still short on concession volunteers for Saturday's game. Please sign up if you can help!",
    },
  },
  {
    id: "seed-4",
    category: "money",
    title: "EXAMPLE: $75 team dues due May 25",
    summary: "Annual team registration fee of $75 is due. Pay online or bring a check to practice.",
    date: daysFromToday(5),
    amount: "$75",
    actionRequired: "Pay team dues",
    sourceExcerpt: "Team dues of $75 are due by May 25. Pay online at the team portal.",
    confidence: "high",
    status: "new",
    emailSource: {
      subject: "Team Dues Reminder",
      sender: "treasurer@swimteam.org",
      body: "Team dues of $75 are due by May 25. Pay online at the team portal.",
    },
  },
  {
    id: "seed-5",
    category: "action",
    title: "EXAMPLE: Bring goggles and team cap to practice",
    summary:
      "Make sure your swimmer has their goggles and team cap for every practice this week.",
    date: daysFromToday(0),
    actionRequired: "Pack goggles and team cap",
    sourceExcerpt:
      "Reminder: all swimmers need goggles and their team cap at every practice.",
    confidence: "high",
    status: "new",
    emailSource: {
      subject: "Practice Reminder",
      sender: "coach@swimteam.org",
      body: "Reminder: all swimmers need goggles and their team cap at every practice.",
    },
  },
];
