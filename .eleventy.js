const markdownIt = require("markdown-it");

module.exports = function(eleventyConfig) {
  // Копируем файл стилей в корень собранного сайта
  eleventyConfig.addPassthroughCopy("style.css");

  // Настраиваем чистый стандартный Markdown-парсер
  let markdownLib = markdownIt({ html: true });
  eleventyConfig.setLibrary("md", markdownLib);

  // Глобальная поддержка пермалинков (чтобы Eleventy читал св-во permalink из метаданных заметок)
  eleventyConfig.addGlobalData("permalink", (data) => {
    if (!data || !data.page) return undefined;
    return data.permalink || undefined; 
  });

  // Базовый трансформер: сейчас он ТОЛЬКО заворачивает контент в HTML-каркас. 
  // Никакие ссылки внутри контента мы пока НЕ трогаем и НЕ меняем.
  eleventyConfig.addTransform("wrap-and-fix-links", function(content, outputPath) {
    if (outputPath && outputPath.endsWith(".html")) {
      const pageTitle = this.page.fileSlug ? this.page.fileSlug.replace(/[-_]/g, ' ') : "Цифровой Сад";

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

  return {
    markdownTemplateEngine: "liquid",
    htmlTemplateEngine: "liquid",
    dir: {
      input: "src/site/notes",
      output: "_site"
    }
  };
};
