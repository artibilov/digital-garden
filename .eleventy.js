const markdownIt = require("markdown-it");
const makeWikilinks = require("markdown-it-wikilinks");

module.exports = function(eleventyConfig) {
  // Движок будет генерировать плоские .html файлы, убирая вложенность папок для сайта
  eleventyConfig.addGlobalData("permalink", "{{ page.fileSlug }}.html");

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
      input: "src/site/notes", // Теперь Eleventy ищет заметки там, куда их кладет плагин
      output: "_site"
    }
  };
};
