const markdownIt = require("markdown-it");
const makeWikilinks = require("markdown-it-wikilinks");

module.exports = function(eleventyConfig) {
  // Настраиваем вики-ссылки с точным указанием .html файлов
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
