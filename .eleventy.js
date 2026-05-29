const markdownIt = require("markdown-it");
const markdownItObsidian = require("markdown-it-obsidian");

module.exports = function(eleventyConfig) {
  // Настраиваем обработчик Markdown и подключаем плагин ссылок Obsidian
  let markdownLib = markdownIt({ html: true }).use(markdownItObsidian, {
    baseDir: "notes"
  });
  eleventyConfig.setLibrary("md", markdownLib);

  // Указываем, откуда брать файлы и куда складывать готовый сайт
  return {
    dir: {
      input: "notes",
      output: "_site"
    }
  };
};
