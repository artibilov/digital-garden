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

  // Создаем и настраиваем парсер Markdown
  let markdownLib = markdownIt({ html: true });
  
  // Хак: перехватываем рендер текста для обработки [[вики-ссылок]]
  const defaultRender = markdownLib.renderer.rules.text || function(tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
  };

  markdownLib.renderer.rules.text = function(tokens, idx, options, env, self) {
    let content = tokens[idx].content;
    
    if (content.includes("[[")) {
      content = content.replace(/\[\[([^\]]+)\]\]/g, (match, p1) => {
        const parts = p1.split("|");
        const rawPath = parts[0].trim();
        const linkText = (parts[1] || parts[0]).trim();
        const fileName = rawPath.split("/").pop().replace(".md", "");
        
        // Определяем текущую папку на основе данных из env (Eleventy передает туда контекст страницы)
        let folder = "sense";
        if (env.page && env.page.inputPath) {
          const pathParts = env.page.inputPath.split("/");
          if (pathParts.length > 2) {
            folder = pathParts[pathParts.length - 2].toLowerCase();
          }
        }
        
        // Магия для префиксов: если мы в confiteor, автоматически добавляем '01-', '02-' и т.д.
        // на основе структуры, которую мы увидели в логах
        let slugified = safeSlug(fileName);
        if (folder === "confiteor") {
          // Вытаскиваем римскую цифру или номер подраздела, чтобы сопоставить с логикой префиксов
          const numMatch = fileName.match(/Подраздел\s+(\d+)/);
          if (numMatch) {
            const num = numMatch[1].padStart(2, '0');
            // Особый случай из логов: Подраздел 34 превращается в 35-palimpsestus-podrazdel-34
            if (num === "34") {
              slugified = `35-palimpsestus-podrazdel-34`;
            } else {
              slugified = `${num}-${slugified}`;
            }
          }
        }

        const cleanUrl = `/digital-garden/${folder}/${slugified}/`;
        return `<a href="${cleanUrl}">${linkText}</a>`;
      });
      return content;
    }
    
    return defaultRender(tokens, idx, options, env, self);
  };

  eleventyConfig.setLibrary("md", markdownLib);

  // Трансформер теперь занимается ТОЛЬКО сборкой каркаса страницы
  eleventyConfig.addTransform("wrap-and-fix-links", function(content, outputPath) {
    if (outputPath && outputPath.endsWith(".html")) {
      const pageTitle = this.page.fileSlug ? this.page.fileSlug.replace(/[-_]/g, ' ') : "Цифровой Сад";

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

  eleventyConfig.addGlobalData("permalink", (data) => {
    if (!data || !data.page) return undefined;
    if (data.permalink) return data.permalink;
    return undefined; 
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
