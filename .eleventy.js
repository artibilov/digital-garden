const markdownIt = require("markdown-it");

function transliterate(text) {
  const ru = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh', 
    'з': 'z', 'и': 'i', 'й': 'j', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 
    'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
  };
  return text.split('').map(char => {
    return ru[char] !== undefined ? ru[char] : char;
  }).join('');
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
  // Инструкция для Eleventy: обязательно копировать файл стилей в итоговый сайт
  eleventyConfig.addPassthroughCopy("style.css");

  eleventyConfig.addGlobalData("permalink", (data) => {
    if (!data || !data.page) return undefined;
    if (data.permalink) return data.permalink;
    return undefined; 
  });

  let markdownLib = markdownIt({ html: true });

  // Трансформер: превращает вики-ссылки И оборачивает страницу в красивый HTML-шаблон
  eleventyConfig.addTransform("wrap-and-fix-links", function(content) {
    if (this.page.outputPath && this.page.outputPath.endsWith(".html")) {
      
      // 1. Сначала парсим вики-ссылки [[...]]
      content = content.replace(/\[\[([^\]]+)\]\]/g, (match, p1) => {
        const parts = p1.split("|");
        const rawPath = parts[0].trim();
        const linkText = (parts[1] || parts[0]).trim();
        const fileName = rawPath.split("/").pop().replace(".md", "");
        const cleanUrl = `/digital-garden/sense/${safeSlug(fileName)}/`;
        return `<a href="${cleanUrl}">${linkText}</a>`;
      });

      // 2. Вытаскиваем заголовок страницы (возьмем имя файла или h1, если найдем)
      const pageTitle = this.page.fileSlug ? this.page.fileSlug.replace(/[-_]/g, ' ') : "Цифровой Сад";

      // 3. Заворачиваем весь этот контент в полноценный HTML-каркас со стилями
      return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageTitle}</title>
   <link rel="stylesheet" href="https://artibilov.github.io/digital-garden/style.css">
<body>
    <div class="container">
        ${content}
    </div>
</body>
</html>`;
    }
    return content;
  });

  eleventyConfig.setLibrary("md", markdownLib);

  eleventyConfig.on("eleventy.after", async ({ results }) => {
    console.log("=== СПИСОК ВСЕХ СГЕНЕРИРОВАННЫХ СТРАНИЦ ===");
    results.forEach(result => console.log("Файл:", result.inputPath, "--> URL:", result.url));
    console.log("==========================================");
  });
  return {
    dir: {
      input: "src/site/notes",
      output: "_site"
    }
  };
};
