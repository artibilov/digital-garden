const markdownIt = require("markdown-it");

// Честный транслитератор без "умных" библиотек
function transliterate(text) {
  const ru = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh', 
    'з': 'z', 'и': 'i', 'й': 'j', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 
    'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
  };
  return text.split('').map(char => ru[char] !== undefined ? ru[char] : char).join('');
}

// Наш кастомный, строгий генератор слагов, который полностью повторяет логику твоего Obsidian-билдера
function safeSlug(text) {
  let slug = text.toLowerCase().trim();
  
  // Если это длинное название Барнса со знаком "и" (например, "01_Вводные образы и концепт времени"),
  // твой плагин обрезает его ровно до союза "и". Повторяем это поведение:
  if (slug.includes(" и ")) {
    slug = slug.split(" и ")[0].trim();
  }
  
  // Убираем римские цифры на старте разделов Кабре (они отсекаются сервером)
  slug = slug.replace(/^(i|ii|iii|iv)\.\s*/, "");
  
  // Заменяем подчеркивания на дефисы
  slug = slug.replace(/_/g, "-");
  
  // Прогоняем через транслит
  slug = transliterate(slug);
  
  // Вычищаем все паразитные символы, кавычки, точки
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

  // ТРАНСФОРМЕР ТЕКСТА ССЫЛОК
  eleventyConfig.addTransform("wrap-and-fix-links", function(content, outputPath) {
    if (outputPath && outputPath.endsWith(".html")) {
      
      content = content.replace(/\[\[([^\]]+)\]\]/g, (match, p1) => {
        const parts = p1.split("|");
        const rawPath = parts[0].trim(); 
        const linkText = (parts[1] || parts[0]).trim(); 

        // Вычисляем целевую папку книги
        let folder = "sense";
        if (rawPath.toLowerCase().startsWith("confiteor/") || rawPath.toLowerCase().includes("confiteor")) {
          folder = "confiteor";
        }

        // Вытаскиваем чистое имя файла из ссылки Obsidian
        const fileName = rawPath.split("/").pop().replace(".md", "");
        
        // Генерируем базовый слаг
        let slugified = safeSlug(fileName);

        // Специфический префикс для подразделов Жауме Кабре (01-, 10-, 12-)
        if (folder === "confiteor") {
          const numMatch = fileName.match(/Подраздел\s+(\d+)/i);
          if (numMatch) {
            const num = numMatch[1].padStart(2, '0');
            slugified = (num === "34") ? `35-palimpsestus-podrazdel-34` : `${num}-${slugified}`;
          }
        }

        // Жесткие алиасы для кастомных страниц, чтобы исключить любые сбои
        const lowerName = fileName.toLowerCase();
        if (lowerName === "обсуждение") slugified = "obsuzhdenie";
        if (lowerName.startsWith("формулы адриана")) slugified = "formuly-adriana";

        // Собираем финальный рабочий URL от корня домена
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
