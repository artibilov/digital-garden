const markdownIt = require("markdown-it");
const makeWikilinks = require("markdown-it-wikilinks");

module.exports = function(eleventyConfig) {
  // Указываем новое имя репозитория для правильных ссылок
  eleventyConfig.addGlobalData("permalink", "{{ page.filePathStem }}.html");

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
      input: "notes",
      output: "_site"
    }
  };
};
