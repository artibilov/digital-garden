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
  // Инструкция для Eleventy: обязательно копировать файл стилей в итоговый сайт
  eleventyConfig.addPassthroughCopy("style.css");

  eleventyConfig.addGlobalData("permalink", (data) => {
    if (!data || !data.page) return undefined;
    if (data.permalink) return data.permalink;
    return undefined; 
  });

  let markdownLib = markdownIt({ html: true });

  // Твой оригинальный рабочий трансформер с точечным фиксом путей
  eleventyConfig.addTransform("wrap-and-fix-links", function(content) {
    if (this.page.outputPath && this.page.outputPath.endsWith(".html")) {
      
      // 1. Сначала парсим вики-ссылки [[...]]
      content = content.replace(/\[\[([^\]]+)\]\]/g, (match, p1) => {
        const parts = p1.split("|");
        const rawPath = parts[0].trim();
        const linkText = (parts[1] || parts[0]).trim();
        let fileName = rawPath.split("/").pop().replace(".md", "");
        
        let folder = "sense";

        // Проверяем, относится ли ссылка к Кабре (наличие римских цифр на старте)
        if (/^(i|ii|iii|iv)\b/i.test(fileName)) {
          folder = "confiteor";
          
          // ЭТО КЛЮЧЕВОЙ ФИКС: Отрезаем ведущую римскую цифру с точкой (например, "I. ")
          // потому что Eleventy при генерации папок её полностью игнорирует!
          fileName = fileName.replace(/^(i|ii|iii|iv)\.\s*/i, "");
        }

        let slugified = safeSlug(fileName);

        // Если мы в разделе Кабре, вытаскиваем номер подраздела для формирования префикса '01-', '10-'
        if (folder === "confiteor") {
          const numMatch = fileName.match(/Подраздел\s+(\d+)/i);
          if (numMatch) {
            const num = numMatch[1].padStart(2, '0');
            // Особый случай из логов для 34 подраздела
            slugified = (num === "34") ? `35-palimpsestus-podrazdel-34` : `${num}-${slugified}`;
          }
        }

        // Собираем точный, проверенный абсолютный путь
        const cleanUrl = `/digital-garden/${folder}/${slugified}/`;
        return `<a href="${cleanUrl}">${linkText}</a>`;
      });

      // 2. Вытаскиваем заголовок страницы
      const pageTitle = this.page.fileSlug ? this.page.fileSlug.replace(/[-_]/g, ' ') : "Цифровой Сад";

      // 3. Заворачиваем весь этот контент в полноценный HTML-каркас
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

  eleventyConfig.setLibrary("md", markdownLib);
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
