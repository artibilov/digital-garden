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
  // Заменяем подчеркивания на дефисы ДО транслитерации, как это делает плагин Obsidian
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

  eleventyConfig.addGlobalData("permalink", (data) => {
    if (!data || !data.page) return undefined;
    return data.permalink || undefined; 
  });

  let markdownLib = markdownIt({ html: true });
  eleventyConfig.setLibrary("md", markdownLib);

  // ГЛАВНЫЙ ТРАНСФОРМЕР ССЫЛОК
  eleventyConfig.addTransform("wrap-and-fix-links", function(content, outputPath) {
    if (outputPath && outputPath.endsWith(".html")) {
      
      // Парсим новые ссылки вида [[folder/Filename|Текст]]
      content = content.replace(/\[\[([^\]]+)\]\]/g, (match, p1) => {
        const parts = p1.split("|");
        const rawPath = parts[0].trim(); // Например, "sense/01_Вводные образы и концепт времени"
        const linkText = (parts[1] || parts[0]).trim(); // То, что кликает пользователь

        // Прямо из пути ссылки вытаскиваем папку (sense или confiteor)
        let folder = "sense";
        if (rawPath.startsWith("confiteor/") || rawPath.toLowerCase().includes("confiteor")) {
          folder = "confiteor";
        }

        // Вытаскиваем чистое имя файла (убираем имя папки и расширение, если оно есть)
        let fileName = rawPath.split("/").pop().replace(".md", "");

        // Если это Кабре, отрезаем римские цифры на старте, так как Eleventy их игнорирует
        if (folder === "confiteor") {
          fileName = fileName.replace(/^(i|ii|iii|iv)\.\s*/i, "");
        }

        // Превращаем имя файла в красивый латинский слаг
        let slugified = safeSlug(fileName);

        // Дополнительный префикс для подразделов Кабре
        if (folder === "confiteor") {
          const numMatch = fileName.match(/Подраздел\s+(\d+)/i);
          if (numMatch) {
            const num = numMatch[1].padStart(2, '0');
            slugified = (num === "34") ? `35-palimpsestus-podrazdel-34` : `${num}-${slugified}`;
          }
        }

        // Специальный фикс для Обсуждения и Формул, если у них в Obsidian нет префиксов папок, 
        // но они должны вести в /sense/
        if (fileName.toLowerCase() === "обсуждение") {
          slugified = "obsuzhdenie";
        }
        if (fileName.toLowerCase().startsWith("формулы адриана")) {
          slugified = "formuly-adriana";
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
      if (data.page.inputPath.endsWith("index.md")) {
        return "index.html";
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
