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
  // Копируем стили
  eleventyConfig.addPassthroughCopy("style.css");

  // Стандартный, чистый Markdown-парсер (не ломает формулы)
  let markdownLib = markdownIt({ html: true });
  eleventyConfig.setLibrary("md", markdownLib);

  // Глобальные данные для поддержки кастомных пермалинков
  eleventyConfig.addGlobalData("permalink", (data) => {
    if (!data || !data.page) return undefined;
    return data.permalink || undefined; 
  });

  // ГЛАВНЫЙ ТРАНСФОРМЕР: Обрабатывает готовый HTML
  eleventyConfig.addTransform("wrap-and-fix-links", function(content, outputPath) {
    if (outputPath && outputPath.endsWith(".html")) {
      
      // 1. Умный парсинг вики-ссылок [[...]]
      content = content.replace(/\[\[([^\]]+)\]\]/g, (match, p1) => {
        const parts = p1.split("|");
        const rawPath = parts[0].trim();
        const linkText = (parts[1] || parts[0]).trim();
        
        // Получаем чистое имя целевого файла (например, "I. A capite. Подраздел 1")
        const targetName = rawPath.split("/").pop().replace(".md", "").toLowerCase().trim();

        // Определяем, в какой папке мы находимся сейчас
        const cleanOutput = outputPath.replace(/\\/g, "/");
        let currentFolder = "sense";
        if (cleanOutput.includes("/confiteor/")) {
          currentFolder = "confiteor";
        }

        // Проверяем внутреннюю коллекцию Eleventy, чтобы найти точный URL сгенерированного файла
        const allPages = (this.contexts && this.contexts[0] && this.contexts[0].collections) 
          ? this.contexts[0].collections.all 
          : [];

        const foundPage = allPages.find(page => {
          if (!page.inputPath) return false;
          const actualFileName = page.inputPath.split("/").pop().replace(".md", "").toLowerCase().trim();
          // Проверяем строгое совпадение имен файлов
          return actualFileName === targetName;
        });

        let cleanUrl;
        if (foundPage && foundPage.url) {
          // Если Eleventy уже знает эту страницу, берем её реальный URL (например, /confiteor/01-a-capite-podrazdel-1/)
          cleanUrl = `/digital-garden${foundPage.url}`;
        } else {
          // Если страница новая или еще не попала в индекс, собираем резервный URL вручную
          let slugified = safeSlug(targetName);
          
          // Костыль для префиксов в confiteor, если страница еще не проиндексирована
          if (currentFolder === "confiteor") {
            const numMatch = targetName.match(/подраздел\s+(\d+)/);
            if (numMatch) {
              const num = numMatch[1].padStart(2, '0');
              slugified = (num === "34") ? `35-palimpsestus-podrazdel-34` : `${num}-${slugified}`;
            }
          }
          cleanUrl = `/digital-garden/${currentFolder}/${slugified}/`;
        }

        return `<a href="${cleanUrl}">${linkText}</a>`;
      });

      // 2. Вытаскиваем заголовок страницы
      const pageTitle = this.page.fileSlug ? this.page.fileSlug.replace(/[-_]/g, ' ') : "Цифровой Сад";

      // 3. Возвращаем чистый HTML-каркас
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
    dir: {
      input: "src/site/notes",
      output: "_site"
    }
  };
};
