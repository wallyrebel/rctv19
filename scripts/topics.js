// Topic hubs group the archive into pages a reader (or a search engine) can land on.
// Each post is matched against `pattern` over its title and excerpt, in the order
// listed here, and keeps at most MAX_TOPICS_PER_POST — most specific first.
const MAX_TOPICS_PER_POST = 3;

// A hub with only a handful of posts is a thin page, so it is not built until it fills up.
const MIN_POSTS_PER_TOPIC = 5;

const TOPICS = [
  {
    slug: 'burnside-music-fest',
    name: 'Burnside Music Fest',
    heading: 'Burnside Music Fest',
    title: 'Burnside Music Fest News, Lineup and Vendor Guides',
    description:
      'Lineup announcements, vendors, sponsors, VIP details and festival guides for the Burnside Music Fest in Ripley, Mississippi.',
    intro:
      'The Burnside Music Fest brings hill country blues back to the Ripley, Mississippi square each year in honor of R.L. Burnside, the Tippah County native whose sound carried north Mississippi blues around the world. RCTV19 covers the festival from the first sponsorship call through the last set of the night: lineup announcements, food and craft vendors, the rib and chicken wing cook-off, VIP tent details, merchandise drops and parking. Everything RCTV19 has published about the festival is collected below, newest first.',
    pattern: /burnside/i
  },
  {
    slug: 'blue-mountain-christian',
    name: 'Blue Mountain Christian',
    heading: 'Blue Mountain Christian University Athletics',
    title: 'Blue Mountain Christian University Sports Coverage',
    description:
      'Scores, results and honors for Blue Mountain Christian University volleyball, soccer, softball, golf and cross country in Tippah County, Mississippi.',
    intro:
      'Blue Mountain Christian University competes in the Southern States Athletic Conference from Blue Mountain, Mississippi, a few miles south of Ripley in Tippah County. RCTV19 follows the Toppers across volleyball, men’s and women’s soccer, softball, golf and cross country, along with the conference and NAIA honors that follow a strong season. Game results, tournament finishes and individual awards are gathered here, newest first.',
    pattern: /blue mountain christian|\bbmcu\b|blue mountain(?:'s|’s)? (?:phillip|cougars)/i
  },
  {
    slug: 'tippah-county-sports',
    name: 'Tippah County Sports',
    heading: 'Tippah County High School Sports',
    title: 'Tippah County High School Sports: Scores and Schedules',
    description:
      'High school football, volleyball, basketball and more from Ripley, Walnut, Falkner, Pine Grove and Blue Mountain in Tippah County, Mississippi.',
    intro:
      'Friday night football, district volleyball and the county tournament run through Ripley, Walnut, Falkner, Pine Grove and Blue Mountain. RCTV19 publishes game previews, results and schedules for Tippah County high school athletics through the fall and winter seasons, including the Ripley Tigers, the Walnut Wildcats and their district opponents. Recent coverage appears below, newest first.',
    pattern:
      /\b(volleyball|football|basketball|softball|baseball|wrestling)\b|\b(tigers|wildcats|bulldogs|indians|eagles)\b|tippah county (?:sports|tournament)|high school sports|tips off/i,
    // University coverage has its own hub, so it is not swept in here as well.
    exclude: /blue mountain christian|\bbmcu\b|northeast|williams baptist|talladega|harding/i
  },
  {
    slug: 'downtown-ripley',
    name: 'Downtown Ripley',
    heading: 'Downtown Ripley and Main Street',
    title: 'Downtown Ripley and Ripley Main Street News',
    description:
      'Shops, murals, extended shopping nights, live music and Main Street programs on the downtown square in Ripley, Mississippi.',
    intro:
      'Ripley’s downtown square is where most of Tippah County’s public life happens: extended shopping nights, live music at The Cut Off, the mural program on Brown and Covington, family movie nights and the storefronts that keep opening along Main Street. RCTV19 covers Ripley Main Street’s programs and the businesses and events that fill the square. Everything published about downtown is collected here, newest first.',
    pattern: /main street|downtown ripley|cut.?off|town square/i
  },
  {
    slug: 'visit-ripley',
    name: 'Visit Ripley',
    heading: 'Things to Do in Ripley, Mississippi',
    title: 'Things to Do in Ripley, MS: Travel and Visitor Guides',
    description:
      'Travel guides to Ripley, Mississippi — hill country blues, murals, local restaurants, the flea market and weekend itineraries in Tippah County.',
    intro:
      'Ripley sits in the north Mississippi hill country an hour southeast of Memphis, and it rewards a day trip: hill country blues history, a growing collection of downtown murals, small-town lunch counters, the First Monday Trade Days flea market and the woods and water around Tippah County Lake. These guides from RCTV19 are written for visitors deciding what to see, where to eat and when to come.',
    pattern:
      /\b(travel guide|getaway|weekend|visit|visitor|things to do|itinerary|hidden gem|day in ripley|tourism|blues alley|hill country blues|lunch culture|public art|mural)\b/i
  },
  {
    slug: 'tippah-county-schools',
    name: 'Schools',
    heading: 'Tippah County Schools and Students',
    title: 'Tippah County Schools, Students and Library News',
    description:
      'School district decisions, student achievements, scholarships, library programs and back-to-school news across Tippah County, Mississippi.',
    intro:
      'RCTV19 follows the South Tippah and North Tippah school districts, the Ripley Public Library and the students who represent Tippah County beyond it — scholarship winners, all-state performers and honor recipients. Policy changes, back-to-school drives and library programming are collected here, newest first.',
    pattern:
      /school district|school board|ripley public library|\blibrary\b|\bstudent\b|scholarship|back.to.school|graduation|all.state|honor roll|education/i
  },
  {
    slug: 'ripley-business',
    name: 'Local Business',
    heading: 'Ripley and Tippah County Business News',
    title: 'Ripley, MS Business Openings and Local Business News',
    description:
      'New businesses, grand openings, relocations and local business milestones in Ripley and across Tippah County, Mississippi.',
    intro:
      'New storefronts, food trucks, pop-up shops, restaurant openings and anniversaries — RCTV19 covers the small businesses that serve Ripley and Tippah County, from the downtown square to the highway. If a business is opening, moving, expanding or marking a milestone in the county, the coverage is collected here, newest first.',
    pattern:
      /\b(opens|opening|grand opening|new location|now open|boutique|restaurant|food truck|smash ?burger|coffee shop|spa|salon|bakery|shop celebrates|business)\b|\banniversary\b|celebrates (?:one|three|its) year/i
  },
  {
    slug: 'community-events',
    name: 'Community Events',
    heading: 'Ripley and Tippah County Community Events',
    title: 'Ripley, MS Community Events, Festivals and Things to Do',
    description:
      'Festivals, parades, movie nights, markets, fundraisers and ceremonies happening in Ripley and Tippah County, Mississippi.',
    intro:
      'Movie nights under the stars, the Christmas parade, Elvis bingo, the kids farmers market, Memorial Day and Fourth of July ceremonies, church fundraisers and open mic nights — Tippah County keeps a full calendar. RCTV19 publishes what is happening, when and where, along with the coverage afterward. Recent event listings and recaps appear here, newest first.',
    pattern:
      /\b(movie night|bingo|festival|parade|farmers market|workshop|ceremony|fireworks|open mic|bash|fundraiser|celebration|juneteenth|memorial day|christmas|pop.?up|county fair|food pantry|voter registration|blood drive)\b|\bfest\b/i
  }
];

const bySlug = new Map(TOPICS.map(topic => [topic.slug, topic]));

// Matching on the title and excerpt keeps a passing mention in the body from
// pulling a post into a hub it does not belong in.
function topicsFor({ title = '', excerpt = '' } = {}) {
  const haystack = `${title} ${excerpt}`;
  return TOPICS.filter(
    topic => topic.pattern.test(haystack) && !(topic.exclude && topic.exclude.test(haystack))
  )
    .slice(0, MAX_TOPICS_PER_POST)
    .map(topic => topic.slug);
}

function topic(slug) {
  return bySlug.get(slug);
}

module.exports = { TOPICS, MIN_POSTS_PER_TOPIC, MAX_TOPICS_PER_POST, topicsFor, topic };
