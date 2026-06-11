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

  // Настраиваем парсер
  let markdownLib = markdownIt({ html: true });

  // Внедряем обработку вики-ссылок на самом глубоком уровне парсера, ДО генерации тегов <p>
  markdownLib.core.ruler.after("inline", "obsidian-links", function(state) {
    state.tokens.forEach(token => {
      if (token.type === "inline" && token.content.includes("[[")) {
        let text = token.content;
        
        // Перехватываем регуляркой чистые скобки из Obsidian
        text = text.replace(/\[\[([^\]]+)\]\]/g, (match, p1) => {
          const parts = p1.split("|");
          const rawPath = parts[0].trim();
          const linkText = (parts[1] || parts[0]).trim();
          const fileName = rawPath.split("/").pop().replace(".md", "");

          // Определяем раздел по пути файла, который сейчас в обработке
          let folder = "sense";
          if (state.env.page && state.env.page.inputPath) {
            const normalizedInput = state.env.page.inputPath.toLowerCase();
            if (normalizedInput.includes("/confiteor/")) {
              folder = "confiteor";
            }
          }

          let slugified = safeSlug(fileName);
          
          // Логика префиксов для Кабре
          if (folder === "confiteor") {
            const numMatch = fileName.match(/Подраздел\s+(\d+)/i);
            if (numMatch) {
              const num = numMatch[1].padStart(2, '0');
              slugified = (num === "34") ? `35-palimpsestus-podrazdel-34` : `${num}-${slugified}`;
            }
          }

          return `<a href="/digital-garden/${folder}/${slugified}/">${linkText}</a>`;
        });
        
        // Возвращаем измененный текст обратно в токен, чтобы markdown-it его отрендерил
        token.content = text;
        
        // Если внутри были ссылки, подменяем дочерние токены, чтобы они рендерились как чистый HTML
        if (text.includes("<a href=")) {
          token.children = [{
            type: "html_inline",
            content: text,
            level: token.level
          }];
        }
      }
    });
  });

  eleventyConfig.setLibrary("md", markdownLib);

  // Трансформер теперь стерилен и просто оборачивает контент в HTML-каркас
  eleventyConfig.addTransform("wrap-and-fix-links", function(content, outputPath) {
    if (outputPath && outputPath.endsWith(".html")) {
      const pathParts = outputPath.replace(/\\/g, "/").split("/");
      const pageTitle = pathParts[pathParts.length - 2] || "Цифровой Сад";

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
    return data.permalink || undefined; 
  });

  return {
    markdownTemplateEngine: false, 
    htmlTemplateEngine: false,     
    dir: {
      input: "src/site/notes",
      output: "_site"
    }
  };
};
