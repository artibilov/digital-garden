const markdownIt = require("markdown-it");

// Функция для превращения любого заголовка в чистый URL-слаг
function safeSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/^sense\//, "") // убираем дублирование папки, если оно есть
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()«»"']/g, "") // вычищаем пунктуацию и кавычки
    .replace(/\s+/g, "-"); // заменяем пробелы на дефисы
}

module.exports = function(eleventyConfig) {
  // Настройка путей для файлов (Eleventy раскладывает их по красивым папкам)
  eleventyConfig.addGlobalData("permalink", (data) => {
    if (!data || !data.page) return undefined;
    if (data.permalink) return data.permalink;
    return undefined; 
  });

  // Создаем чистый парсер Markdown
  let markdownLib = markdownIt({ html: true });

  // Жёсткий перехватчик текста: правит ссылки прямо в исходном коде заметок перед рендерингом
  eleventyConfig.addTransform("fix-obsidian-links", function(content) {
    // Работаем только с HTML файлами
    if (this.page.outputPath && this.page.outputPath.endsWith(".html")) {
      
      // Ищем стандартные Markdown ссылки [Текст](Путь)
      // и заменяем их на абсолютные чистые пути
      content = content.replace(/href="([^"]+)"/g, (match, p1) => {
        // Если ссылка ведет на внутреннюю заметку .md или содержит папку sense
        if (p1.includes(".md") || p1.includes("sense/") || !p1.startsWith("http")) {
          // Вытаскиваем имя файла/заметки
          const fileName = p1.split("/").pop().replace(".md", "");
          return `href="/digital-garden/sense/${safeSlug(fileName)}/"`;
        }
        return match;
      });

      // На всякий случай обрабатываем сырые вики-ссылки [[Имя Заметки]], если они остались
      content = content.replace(/\[\[([^\]]+)\]\]/g, (match, p1) => {
        const parts = p1.split("|");
        const linkText = parts[1] || parts[0];
        const linkPath = parts[0];
        return `<a href="/digital-garden/sense/${safeSlug(linkPath)}/">${linkText}</a>`;
      });
    }
    return content;
  });

  eleventyConfig.setLibrary("md", markdownLib);

  return {
    dir: {
      input: "src/site/notes",
      output: "_site"
    }
  };
};
