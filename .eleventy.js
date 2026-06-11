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
  // 1. Сначала превращаем подчеркивания в дефисы (чтобы 01_вводные стало 01-вводные)
  slug = slug.replace(/_/g, "-");
  // 2. Делаем транслитерацию
  slug = transliterate(slug);
  // 3. Убираем знаки препинания и кавычки, но сохраняем дефисы и цифры
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

  // ТРАНСФОРМЕР ССЫЛОК
  eleventyConfig.addTransform("wrap-and-fix-links", function(content, outputPath) {
    if (outputPath && outputPath.endsWith(".html")) {
      
      content = content.replace(/\[\[([^\]]+)\]\]/g, (match, p1) => {
        const parts = p1.split("|");
        const rawPath = parts[0].trim(); 
        const linkText = (parts[1] || parts[0]).trim(); 

        // Определение папки книги
        let folder = "sense";
        if (rawPath.toLowerCase().startsWith("confiteor/") || rawPath.toLowerCase().includes("confiteor")) {
          folder = "confiteor";
        }

        // Извлекаем только имя файла (без папок и расширения .md)
        let fileName = rawPath.split("/").pop().replace(".md", "");

        let slugified = "";

        if (folder === "confiteor") {
          // Для Кабре: убираем римскую цифру на старте типа "I. "
          let cleanName = fileName.replace(/^(i|ii|iii|iv)\.\s*/i, "");
          slugified = safeSlug(cleanName);

          // Ищем номер подраздела для добавления числового префикса (например, "10-de-pueritia...")
          const numMatch = cleanName.match(/Подраздел\s+(\d+)/i);
          if (numMatch) {
            const num = numMatch[1].padStart(2, '0');
            if (num === "34") {
              slugified = `35-palimpsestus-podrazdel-34`;
            } else {
              slugified = `${num}-${slugified}`;
            }
          }
        } else {
          // Для Барнса (папка sense): просто прогоняем имя файла через safeSlug
          slugified = safeSlug(fileName);
        }

        // Ручные фиксы для кастомных страниц
        if (fileName.toLowerCase() === "обсуждение") slugified = "obsuzhdenie";
        if (fileName.toLowerCase().startsWith("формулы адриана")) slugified = "formuly-adriana";

        // Собираем итоговый URL
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
