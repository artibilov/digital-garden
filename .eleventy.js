const markdownIt = require("markdown-it");

// Функция перевода кириллицы в латиницу (транслит)
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
  
  slug = slug.replace(/^sense\//, ""); // убираем префикс папки, если он прилетел
  slug = slug.replace(/_/g, "-");     // заменяем нижнее подчеркивание на дефис
  
  slug = transliterate(slug);         // переводим в транслит
  
  // Вычищаем знаки препинания и превращаем пробелы в дефисы
  slug = slug
    .replace(/[.,\/#!$%\^&\*;:{}=\_`~()«»"']/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");             
    
  return slug;
}

module.exports = function(eleventyConfig) {
  eleventyConfig.addGlobalData("permalink", (data) => {
    if (!data || !data.page) return undefined;
    if (data.permalink) return data.permalink;
    return undefined; 
  });

  let markdownLib = markdownIt({ html: true });

  // Главный обработчик: превращает сырой текст [[вики-ссылок]] в рабочий HTML
  eleventyConfig.addTransform("fix-obsidian-links", function(content) {
    if (this.page.outputPath && this.page.outputPath.endsWith(".html")) {
      
      // Ищем конструкции вида [[путь|текст]] или просто [[путь]]
      content = content.replace(/\[\[([^\]]+)\]\]/g, (match, p1) => {
        const parts = p1.split("|");
        const rawPath = parts[0].trim();              // то, что слева (название файла или путь)
        const linkText = (parts[1] || parts[0]).trim(); // то, что справа (отображаемый текст)
        
        // Вытаскиваем чистое имя файла из хвоста пути (убираем "sense/")
        const fileName = rawPath.split("/").pop().replace(".md", "");
        
        // Собираем идеальную абсолютную ссылку
        const cleanUrl = `/digital-garden/sense/${safeSlug(fileName)}/`;
        
        return `<a href="${cleanUrl}">${linkText}</a>`;
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
