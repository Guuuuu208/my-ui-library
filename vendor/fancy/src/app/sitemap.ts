import fs from "node:fs"
import path from "node:path"
import type { MetadataRoute } from "next"

import { siteConfig } from "@/config/site"
import { CONTENT_DIRECTORY } from "@/lib/get-docs"

function getDocSlugs(): string[][] {
  const contentPath = path.join(process.cwd(), CONTENT_DIRECTORY)
  const targets = fs.readdirSync(contentPath, { recursive: true })

  const slugs: string[][] = []

  for (const target of targets) {
    const fullPath = path.join(contentPath, target.toString())
    if (fs.lstatSync(fullPath).isDirectory()) {
      continue
    }
    if (!target.toString().endsWith(".mdx")) {
      continue
    }
    slugs.push(
      target.toString().replace(".mdx", "").replace(/\\/g, "/").split("/")
    )
  }

  return slugs
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteConfig.url

  const docSlugs = getDocSlugs()
  const docUrls: MetadataRoute.Sitemap = docSlugs.map((slugParts) => ({
    url: `${baseUrl}/docs/${slugParts.join("/")}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }))

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/components`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    ...docUrls,
  ]
}
