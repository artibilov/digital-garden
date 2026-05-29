const markdownIt = require("markdown-it");
const makeWikilinks = require("markdown-it-wikilinks");

module.exports = function(eleventyConfig) {
  // Настройка путей для файлов (Eleventy раскладывает их по красивым папкам)
  eleventyConfig.addGlobalData("permalink", (data) => {
    if (!data || !data.page) {
      return undefined; 
    }
    if (data.permalink) {
      return data.permalink;
    }
    return undefined; 
  });

  const wikilinks = makeWikilinks({
    baseURL: "/digital-garden/",
    relativeURLs: false,
    makeUrl: (name) => {
      // 1. Делаем имя строчным
      let slug = name.toLowerCase().trim();
      
      // 2. Если плагин передал путь вместе с папкой "sense/", убираем этот префикс, чтобы не дублировать
      slug = slug.replace(/^sense\//, "");
      
      // 3. Очищаем от специфических символов, кавычек и знаков препинания
      slug = slug
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()«»"']/g, "")
        .replace(/\s+/g, "-"); // заменяем пробелы на дефисы
      
      // 4. Возвращаем строгий абсолютный путь от корня домена Гитхаба
      return "/digital-garden/sense/" + slug + "/";
    }
  });

  let markdownLib = markdownIt({ html: true }).use(wikilinks);
  eleventyConfig.setLibrary("md", markdownLib);

  return {
    dir: {
      input: "src/site/notes",
      output: "_site"
    }
  };
};
