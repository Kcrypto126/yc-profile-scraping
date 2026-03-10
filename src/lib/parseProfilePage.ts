import type { CheerioAPI } from "cheerio";

/** Build profile object from scraped candidate page ($ and mainContent). Used by scrape-one and scrape-again. */
export function buildProfileFromCheerio(
  $: CheerioAPI,
  mainContent: ReturnType<CheerioAPI>,
  userId: string
) {
  const age = mainContent.find('[title="Age"]').text().replace(/\D/g, "");

  return {
    userId,
    name: mainContent.find(".css-y9z691").text().trim(),
    location: mainContent.find('[title="Location"]').text().trim(),
    age: age ? parseInt(age, 10) : null,
    lastSeen: mainContent
      .find('[title="Last seen on co-founder matching"]')
      .text()
      .replace("Last seen ", "")
      .trim(),
    avatar: mainContent.find(".css-1bm26bw").attr("src"),
    sumary: mainContent.find(".css-1wz7m2j").text().trim(),
    intro: mainContent
      .find('span.css-19yrmx8:contains("Intro")')
      .next(".css-1tp1ukf")
      .text()
      .trim(),
    lifeStory: mainContent
      .find('span.css-19yrmx8:contains("Life Story")')
      .next(".css-1tp1ukf")
      .text()
      .trim(),
    freeTime: mainContent
      .find('span.css-19yrmx8:contains("Free Time")')
      .next(".css-1tp1ukf")
      .text()
      .trim(),
    other: mainContent
      .find('span.css-19yrmx8:contains("Other")')
      .next(".css-1tp1ukf")
      .text()
      .trim(),
    accomplishments: mainContent
      .find('span.css-19yrmx8:contains("Impressive accomplishment")')
      .next(".css-1tp1ukf")
      .text()
      .trim(),
    education: (() => {
      const section = mainContent
        .find('.css-19yrmx8:contains("Education")')
        .next(".css-1tp1ukf");
      if (!section.length) return null;
      const byNew = section.find(".css-1a0w822");
      if (byNew.length) return byNew.map((_, el) => $(el).text().trim()).get();
      const legacy = section.find(".css-kaq1dv");
      if (legacy.length) return legacy.map((_, el) => $(el).text().trim()).get();
      return null;
    })(),
    employment: (() => {
      const section = mainContent
        .find('.css-19yrmx8:contains("Employment")')
        .next(".css-1tp1ukf");
      if (!section.length) return null;
      const byNew = section.find(".css-1a0w822");
      if (byNew.length) return byNew.map((_, el) => $(el).text().trim()).get();
      const legacy = section.find(".css-kaq1dv");
      if (legacy.length) return legacy.map((_, el) => $(el).text().trim()).get();
      return null;
    })(),
    startup: {
      name:
        mainContent.find(".css-bcaew0 b").first().text().trim() !== ""
          ? mainContent.find(".css-bcaew0 b").first().text().trim()
          : "Potential Idea",
      description: (() => {
        const startupName = mainContent
          .find(".css-bcaew0 b")
          .first()
          .text()
          .trim();
        if (!startupName) {
          return mainContent.find("div.css-1hla380").text().trim();
        }
        const labelSpan = mainContent
          .find("span.css-19yrmx8")
          .filter((_, el) => $(el).text().trim() === startupName)
          .first();
        if (labelSpan.length) {
          return labelSpan.next(".css-1tp1ukf").text().trim();
        }
        return mainContent.find("div.css-1hla380").text().trim();
      })(),
      progress: mainContent
        .find('span.css-19yrmx8:contains("Progress")')
        .next(".css-1tp1ukf")
        .text()
        .trim(),
      funding: mainContent
        .find('span.css-19yrmx8:contains("Funding Status")')
        .next(".css-1tp1ukf")
        .text()
        .trim(),
    },
    cofounderPreferences: {
      requirements: mainContent
        .find(".css-1hla380 p")
        .map((_, el) => $(el).text().trim())
        .get(),
      idealPersonality: mainContent
        .find('span.css-19yrmx8:contains("Ideal co-founder")')
        .next(".css-1tp1ukf")
        .text()
        .trim(),
      equity: mainContent
        .find('span.css-19yrmx8:contains("Equity expectations")')
        .next(".css-1tp1ukf")
        .text()
        .trim(),
    },
    interests: {
      shared: (() => {
        const section = mainContent
          .find('span.css-19yrmx8:contains("Our shared interests")')
          .next(".css-1tp1ukf");
        if (!section.length) return null;
        const items = section.find(".css-1iujaz8");
        if (items.length) return items.map((_, el) => $(el).text().trim()).get();
        const legacy = mainContent.find(".css-1v9f1hn");
        if (legacy.length) return legacy.map((_, el) => $(el).text().trim()).get();
        return null;
      })(),
      personal: (() => {
        const section = mainContent
          .find('span.css-19yrmx8:contains("My interests")')
          .next(".css-1tp1ukf");
        if (!section.length) return null;
        const items = section.find(".css-17813s4");
        if (items.length) return items.map((_, el) => $(el).text().trim()).get();
        const legacy = mainContent.find(".css-1lw35t7");
        if (legacy.length) return legacy.map((_, el) => $(el).text().trim()).get();
        return null;
      })(),
    },
    linkedIn: mainContent.find(".css-107cmgv").attr("title"),
    technical: (() => {
      const p = mainContent.find("p.css-vqx3x2");
      if (!p.length) return null;
      const firstB = p.find("b").first().text().trim().toLowerCase();
      if (firstB === "non-technical") return false;
      if (firstB === "technical") return true;
      return null;
    })(),
  };
}

export const MAIN_SELECTOR = ".css-139x40p";
