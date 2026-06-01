const markdownIt = require("markdown-it");

// Функция перевода кириллицы в латиницу (транслит под Obsidian)
function transliterate(text) {
  const ru = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh', 
    'з': 'z', 'и': 'i', 'й': 'j', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'cz', 
    'ч': 'ch', 'ш': 'sh', 'щ': 'shh', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
  };
  return text.split('').map(char => {
    return ru[char] !== undefined ? ru[char] : char;
  }).join('');
}

// Функция создания точного URL-слага
function safeSlug(text) {
  let slug = text.toLowerCase().trim();
  
  slug = slug.replace(/^sense\//, ""); // убираем префикс папки
  slug = slug.replace(/_/g, "-");     // ЗАМЕНЯЕМ нижнее подчеркивание на дефис (чтобы 01_вводные стало 01-вводные)
  
  slug = transliterate(slug);         // Переводим в латиницу
  
  // Вычищаем оставшуюся грязь и знаки препинания, заменяя пробелы на дефисы
  slug = slug
    .replace(/[.,\/#!$%\^&\*;:{}=\_`~()«»"']/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");             // убираем двойные дефисы, если они появились
    
  return slug;
}

module.exports = function(eleventyConfig) {
  eleventyConfig.addGlobalData("permalink", (data) => {
    if (!data || !data.page) return undefined;
    if (data.permalink) return data.permalink;
    return undefined; 
  });

  let markdownLib = markdownIt({ html: true });

  // Перехватчик ссылок в готовом HTML
  eleventyConfig.addTransform("fix-obsidian-links", function(content) {
    if (this.page.outputPath && this.page.outputPath.endsWith(".html")) {
      
      // Обрабатываем ссылки формата href="..."
      content = content.replace(/href="([^"]+)"/g, (match, p1) => {
        // Проверяем, что ссылка внутренняя и не ведет на внешние сайты
        if (p1.includes(".md") || p1.includes("sense/") || (!p1.startsWith("http") && !p1.startsWith("#"))) {
          const fileName = p1.split("/").pop().replace(".md", "");
          
          // Если это главная страница, не трогаем её редирект
          if (fileName === "index" || fileName === "") return match;
          
          return `href="/digital-garden/sense/${safeSlug(fileName)}/"`;
        }
        return match;
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
