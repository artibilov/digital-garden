const markdownIt = require("markdown-it");

function transliterate(text) {
  const ru = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh', 
    'з': 'z', 'и': 'i', 'й': 'j', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 
    'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
  };
  return text.split('').map(char => ru[char] !== undefined ? ru[char] : char).join('');
}

function safeSlug(text) {
  let slug = text.toLowerCase().trim();
  slug = slug.replace(/^sense\//, "");
  slug = slug.replace(/_/g, "-");
  slug = transliterate(slug);
  slug = slug
    .replace(/[.,\/#!$%\^&\*;:{}=\_`~()«»"']/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");             
  return slug;
}

module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("style.css");

  // Чистый парсер без кастомных правил для текста (чтобы не ломать математические формулы!)
  let markdownLib = markdownIt({ html: true });
  eleventyConfig.setLibrary("md", markdownLib);

  eleventyConfig.addGlobalData("permalink", (data) => {
    if (!data || !data.page) return undefined;
    return data.permalink || undefined; 
  });

  // Надежный трансформер готового HTML
  eleventyConfig.addTransform("wrap-and-fix-links", function(content, outputPath) {
    if (outputPath && outputPath.endsWith(".html")) {
      
      // Парсим вики-ссылки
      content = content.replace(/\[\[([^\]]+)\]\]/g, (match, p1) => {
        const parts = p1.split("|");
        const rawPath = parts[0].trim();
        const linkText = (parts[1] || parts[0]).trim();
        const fileName = rawPath.split("/").pop().replace(".md", "");

        const normalizedPath = outputPath.replace(/\\/g, "/").toLowerCase();
        let folder = "sense";
        
        if (normalizedPath.includes("/confiteor/")) {
          folder = "confiteor";
        }

        let slugified = safeSlug(fileName);
        
        if (folder === "confiteor") {
          const numMatch = fileName.match(/Подраздел\s+(\d+)/i);
          if (numMatch) {
            const num = numMatch[1].padStart(2, '0');
            slugified = (num === "34") ? `35-palimpsestus-podrazdel-34` : `${num}-${slugified}`;
          }
        }

        const cleanUrl = `/digital-garden/${folder}/${slugified}/`;
        return `<a href="${cleanUrl}">${linkText}</a>`;
      });

      const pageTitle = this.page.fileSlug ? this.page.fileSlug.replace(/[-_]/g, ' ') : "Цифровой Сад";

      return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageTitle}</title>
    <link rel="stylesheet" href="https://artibilov.github.io/digital-garden/style.css">
</head>
<body>
    <div class="container">
        ${content}
    </div>
</body>
</html>`;
    }
    return content;
  });

  eleventyConfig.addGlobalData("eleventyComputed.permalink", () => {
    return (data) => {
      if (data.page.inputPath.endsWith("sense/index.md")) {
        return "sense/index.html";
      }
      return data.permalink;
    };
  });

  return {
    markdownTemplateEngine: "liquid", // Возвращаем стабильный жидкий движок для логики путей
    htmlTemplateEngine: "liquid",
    dir: {
      input: "src/site/notes",
      output: "_site"
    }
  };
};
