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

  // Стандартный парсер Markdown (формулы Адриана в безопасности)
  let markdownLib = markdownIt({ html: true });
  eleventyConfig.setLibrary("md", markdownLib);

  eleventyConfig.addGlobalData("permalink", (data) => {
    if (!data || !data.page) return undefined;
    return data.permalink || undefined; 
  });

  // ТРАНСФОРМЕР С ОТНОСИТЕЛЬНЫМИ ПУТЯМИ
  eleventyConfig.addTransform("wrap-and-fix-links", function(content, outputPath) {
    if (outputPath && outputPath.endsWith(".html")) {
      
      // 1. Прячем формулы и код
      const placeholders = [];
      content = content.replace(/(<code[^>]*>[\s\S]*?<\/code>|<pre[^>]*>[\s\S]*?<\/pre>|\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g, (match) => {
        const id = `___PLACEHOLDER_${placeholders.length}___`;
        placeholders.push({ id, original: match });
        return id;
      });

      // Нормализуем текущий путь обрабатываемой страницы
      const normalizedPath = outputPath.replace(/\\/g, "/").toLowerCase();

      // 2. Парсим вики-ссылки
      content = content.replace(/\[\[([^\]]+)\]\]/g, (match, p1) => {
        const parts = p1.split("|");
        const rawPath = parts[0].trim();
        const linkText = (parts[1] || parts[0]).trim();
        const fileName = rawPath.split("/").pop().replace(".md", "");

        // Определяем, в какую папку должна вести ссылка
        let targetFolder = "sense";
        if (normalizedPath.includes("/confiteor/") || rawPath.toLowerCase().includes("confiteor")) {
          targetFolder = "confiteor";
        }

        let slugified = safeSlug(fileName);
        
        if (targetFolder === "confiteor") {
          const numMatch = fileName.match(/Подраздел\s+(\d+)/i);
          if (numMatch) {
            const num = numMatch[1].padStart(2, '0');
            slugified = (num === "34") ? `35-palimpsestus-podrazdel-34` : `${num}-${slugified}`;
          }
        }

        // ВЫЧИСЛЯЕМ ОТНОСИТЕЛЬНЫЙ ПУТЬ К КОРНЮ ПРОЕКТА
        // Считаем, сколько папок нужно пройти вверх от текущего outputPath до папки _site
        const relativeSegments = normalizedPath.split("/_site/")[1];
        let pathToRoot = "./";
        if (relativeSegments) {
          const depth = relativeSegments.split("/").length - 1;
          if (depth > 0) {
            pathToRoot = "../".repeat(depth);
          }
        }

        // Собираем железобетонный относительный URL
        const cleanUrl = `${pathToRoot}${targetFolder}/${slugified}/`;
        return `<a href="${cleanUrl}">${linkText}</a>`;
      });

      // 3. Возвращаем формулы на место
      placeholders.forEach(placeholder => {
        content = content.replace(placeholder.id, placeholder.original);
      });

      // Корректный заголовок
      const pathParts = outputPath.replace(/\\/g, "/").split("/");
      const pageTitle = pathParts[pathParts.length - 2] || "Цифровой Сад";

      return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageTitle}</title>
    <link rel="stylesheet" href="style.css">
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
