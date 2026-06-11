const markdownIt = require("markdown-it");

module.exports = function(eleventyConfig) {
  // Копируем файл стилей в корень сайта
  eleventyConfig.addPassthroughCopy("style.css");

  // Настраиваем чистый стандартный Markdown-парсер
  let markdownLib = markdownIt({ html: true });
  eleventyConfig.setLibrary("md", markdownLib);

  // Глобальная поддержка пермалинков
  eleventyConfig.addGlobalData("permalink", (data) => {
    if (!data || !data.page) return undefined;
    return data.permalink || undefined; 
  });

  // Универсальный трансформер ссылок и шаблона
  eleventyConfig.addTransform("wrap-and-fix-links", function(content, outputPath) {
    if (outputPath && outputPath.endsWith(".html")) {
      
      // Парсим вики-ссылки [[...]] на основе внутренней карты коллекции Eleventy
      content = content.replace(/\[\[([^\]]+)\]\]/g, (match, p1) => {
        const parts = p1.split("|");
        const rawPath = parts[0].trim();
        const linkText = (parts[1] || parts[0]).trim();
        
        // Чистое имя файла, как оно написано в Obsidian
        const targetFileName = rawPath.split("/").pop().replace(".md", "").toLowerCase().trim();

        // Ищем эту страницу во внутренней коллекции собранных файлов Eleventy
        const allPages = (this.contexts && this.contexts[0] && this.contexts[0].collections) 
          ? this.contexts[0].collections.all 
          : [];

        const foundPage = allPages.find(page => {
          if (!page.inputPath) return false;
          const actualFileName = page.inputPath.split("/").pop().replace(".md", "").toLowerCase().trim();
          return actualFileName === targetFileName;
        });

        // Если Eleventy нашел страницу в проекте, берем её ОФИЦИАЛЬНЫЙ URL
        if (foundPage && foundPage.url) {
          return `<a href="/digital-garden${foundPage.url}">${linkText}</a>`;
        }

        // Резервный вариант для ссылок, которые еще не созданы
        return `<a href="#">${linkText}</a>`;
      });

      // Корректный заголовок страницы
      const pageTitle = this.page.fileSlug ? this.page.fileSlug.replace(/[-_]/g, ' ') : "Цифровой Сад";

      // Собираем идеальный HTML-каркас (исправлена ошибка с тегом </head>)
      return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageTitle}</title>
    <link rel="stylesheet" href="/digital-garden/style.css">
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
    markdownTemplateEngine: "liquid",
    htmlTemplateEngine: "liquid",
    dir: {
      input: "src/site/notes",
      output: "_site"
    }
  };
};
