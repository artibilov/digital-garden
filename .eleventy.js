const markdownIt = require("markdown-it");
const makeWikilinks = require("markdown-it-wikilinks");

module.exports = function(eleventyConfig) {
  // Заставляем Eleventy сохранять файлы как имя.html прямо в корень, а не в папки
  eleventyConfig.addGlobalData("permalink", "{{ page.filePathStem }}.html");

  const wikilinks = makeWikilinks({
    baseURL: "/garden-test/",
    relativeURLs: false,
    makeUrl: (name) => {
      return "/garden-test/" + name.toLowerCase().replace(/ /g, "-") + ".html";
    }
  });

  let markdownLib = markdownIt({ html: true }).use(wikilinks);
  eleventyConfig.setLibrary("md", markdownLib);

  return {
    dir: {
      input: "notes",
      output: "_site"
    }
  };
};
