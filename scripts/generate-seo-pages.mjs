import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SERVICE_CATEGORIES } from "../js/serviceCatalogData.js";
import { DIRECTORY_TOWNS } from "../js/directoryData.js";

const outFile = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "sitemap.xml");
const ORIGIN = "https://mototap.co.ke";

const urls = [
  { loc: `${ORIGIN}/`, priority: "1.0" },
  { loc: `${ORIGIN}/about`, priority: "0.8" },
  { loc: `${ORIGIN}/terms`, priority: "0.5" },
  { loc: `${ORIGIN}/privacy-policy`, priority: "0.5" },
];

for (const category of SERVICE_CATEGORIES) {
  urls.push({ loc: `${ORIGIN}/services/${category.id}`, priority: "0.8" });
  for (const town of DIRECTORY_TOWNS) {
    urls.push({
      loc: `${ORIGIN}/mechanics/${town.slug}?service=${encodeURIComponent(category.id)}`,
      priority: "0.7",
    });
  }
}

for (const town of DIRECTORY_TOWNS) {
  urls.push({ loc: `${ORIGIN}/mechanics/${town.slug}`, priority: "0.7" });
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (row) => `  <url>
    <loc>${row.loc}</loc>
    <changefreq>weekly</changefreq>
    <priority>${row.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;

await writeFile(outFile, sitemap);
console.log(`Wrote ${urls.length} URLs to public/sitemap.xml`);
