const markdownIt = require("markdown-it");
const makeWikilinks = require("markdown-it-wikilinks");

module.exports = function(eleventyConfig) {
  // Вычисляем путь динамически средствами JavaScript, а не шаблонизатора
  eleventyConfig.addGlobalData("permalink", (data) => {
    // Если в YAML-заголовке заметки жестко прописан permalink (как у index.md), берем его
    if (data.permalink) {
      return data.permalink;
    }
    // Для всех остальных файлов убираем префикс папки плагина и добавляем .html
    return data.page.filePathStem.replace("/src/site/notes/", "") + ".html";
  });

  const wikilinks = makeWikilinks({
    baseURL: "/digital-garden/",
    relativeURLs: false,
    makeUrl: (name) => {
      return "/digital-garden/" + name.toLowerCase().replace(/ /g, "-") + ".html";
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
