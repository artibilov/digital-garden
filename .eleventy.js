const markdownIt = require("markdown-it");

module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("style.css");

  // Поддержка пермалинков
  eleventyConfig.addGlobalData("permalink", (data) => {
    if (!data || !data.page) return undefined;
    return data.permalink || undefined; 
  });

  let markdownLib = markdownIt({ html: true });
  eleventyConfig.setLibrary("md", markdownLib);

  // ТРАНСФОРМЕР ССЫЛОК И СБОРКА МЕНЮ
  eleventyConfig.addTransform("wrap-and-fix-links", function(content, outputPath) {
    if (outputPath && outputPath.endsWith(".html")) {
      
      // 1. Исправление вики-ссылок [[...]] во всех статьях контента
      content = content.replace(/\[\[([^\]]+)\]\]/g, (match, p1) => {
        const parts = p1.split("|");
        const rawPath = parts[0].trim(); 
        const linkText = (parts[1] || parts[0]).trim(); 

        const targetFileName = rawPath.split("/").pop().replace(".md", "").toLowerCase().trim();
        const allPages = this.page.collection ? this.page.collection.all : [];
        const pagesSource = (allPages.length > 0) ? allPages : (global.eleventyCollectionsAll || []);

        const foundPage = pagesSource.find(page => {
          if (!page.inputPath) return false;
          const actualFileName = page.inputPath.split("/").pop().replace(".md", "").toLowerCase().trim();
          return actualFileName === targetFileName;
        });

        if (foundPage && foundPage.url) {
          return `<a href="/digital-garden${foundPage.url}">${linkText}</a>`;
        }
        return `<a href="#">${linkText}</a>`;
      });

      // 2. СБОРКА САЙДБАРА СТРОГО ИЗ СКОМПИЛИРОВАННОГО HTML ФАЙЛА КОНФИГУРАЦИИ
      const currentFolder = this.page.inputPath.split("/").reverse()[1]; 

      const currentBookCollection = global.eleventyCollectionsAll ? 
        global.eleventyCollectionsAll.filter(p => p.inputPath && p.inputPath.includes(`/${currentFolder}/`)) : [];

      // Жесткий поиск: ищем файл конфигурации, в системном пути которого есть "sidebar-config.md"
      const configPage = currentBookCollection.find(p => p.inputPath && p.inputPath.toLowerCase().includes("sidebar-config.md"));

      // Ищем главную страницу книги для красивого заголовка
      const indexPage = currentBookCollection.find(p => p.data && (p.data.type === "index" || p.data.type === "main"));

      let currentBookTitle = currentFolder.charAt(0).toUpperCase() + currentFolder.slice(1);
      if (indexPage && indexPage.data && indexPage.data.title) {
        currentBookTitle = indexPage.data.title;
      }

      let sidebarHtml = `<nav class="sidebar-nav">
        <div class="sidebar-back-link">
          <a href="/digital-garden/">← На главную</a>
        </div>
        <h3>${currentBookTitle}</h3>`;

      // Ссылка на Оглавление книги — всегда на самый верх
      if (indexPage) {
        const isIndexActive = (indexPage.url === this.page.url) ? 'class="active-node"' : '';
        sidebarHtml += `<ul class="menu-section-main">
          <li ${isIndexActive}><a href="/digital-garden${indexPage.url}">📌 Главная страница книги</a></li>
        </ul><hr class="menu-divider">`;
      }

      // Парсим HTML конфигурационного файла, который Eleventy обязан выдать нам в память
      let menuContentHtml = "";
      if (configPage && configPage.content) {
        // Режем отрендеренный контент по заголовкам h3 (наши ### в Obsidian)
        const blocks = configPage.content.split(/<h3[^>]*>/i);

        for (let i = 1; i < blocks.length; i++) {
          const block = blocks[i];
          
          const closeH3Index = block.toLowerCase().indexOf("</h3>");
          if (closeH3Index === -1) continue;

          const sectionTitle = block.substring(0, closeH3Index).trim();

          const ulStartIndex = block.toLowerCase().indexOf("<ul");
          const ulEndIndex = block.toLowerCase().indexOf("</ul>");

          if (ulStartIndex !== -1 && ulEndIndex !== -1 && ulStartIndex < ulEndIndex) {
            let ulBlock = block.substring(ulStartIndex, ulEndIndex + 5);

            // Подсвечиваем активную страницу, если читатель сидит на ней
            const currentUrlChunk = this.page.url;
            if (currentUrlChunk) {
              const escapedUrl = currentUrlChunk.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
              const activeLiRegex = new RegExp(`(<li[^>]*>\\s*<a\\s+href="[^"]*${escapedUrl}"[^>]*>)`, "i");
              ulBlock = ulBlock.replace(activeLiRegex, '<li class="active-node">$1');
            }

            menuContentHtml += `<div class="sidebar-menu-section">`;
            menuContentHtml += `<span class="menu-section-title">${sectionTitle}</span>`;
            menuContentHtml += `${ulBlock}`;
            menuContentHtml += `</div><hr class="menu-divider">`;
          }
        }
      }

      // Если контент-менеджер собрал пункты, выводим их
      if (menuContentHtml) {
        sidebarHtml += menuContentHtml;
        sidebarHtml = sidebarHtml.replace(/<hr class="menu-divider"><\/nav>$/, "</nav>");
      } else {
        // Если configPage не найден или пуст — выводим системное предупреждение вместо старой каши
        sidebarHtml += `<p style="padding: 10px; color: #e53e3e; font-size: 0.9rem;">⚠️ Файл sidebar-config.md не найден в памяти сборщика или пуст.</p>`;
      }

      sidebarHtml += `</nav>`;

      const pageTitle = this.page.fileSlug ? this.page.fileSlug.replace(/[-_]/g, ' ') : "Цифровой Сад";
      const isMainPage = (this.page.url === "/" || this.page.url === "/index.html");
      const bodyClass = isMainPage ? "main-page-layout" : "";
      const renderSidebar = isMainPage ? "" : sidebarHtml;

      return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageTitle}</title>
    <link rel="stylesheet" href="/digital-garden/style.css">
</head>
<body class="${bodyClass}">
    <div class="layout-wrapper">
        ${renderSidebar}
        <main class="content-container">
            <div class="container">
                ${content}
            </div>
        </main>
    </div>
    <script>
        document.addEventListener("DOMContentLoaded", function() {
            var sidebar = document.querySelector(".sidebar-nav");
            if (!sidebar) return;
            var scrollTop = sessionStorage.getItem("sidebar-scroll");
            if (scrollTop) { sidebar.scrollTop = parseInt(scrollTop, 10); }
            window.addEventListener("beforeunload", function() {
                sessionStorage.setItem("sidebar-scroll", sidebar.scrollTop);
            });
        });
    </script>
</body>
</html>`;
    }
    return content;
  });

  eleventyConfig.addCollection("allPagesGlobal", function(collectionApi) {
    global.eleventyCollectionsAll = collectionApi.getAll();
    return global.eleventyCollectionsAll;
  });

  eleventyConfig.addGlobalData("eleventyComputed.permalink", () => {
    return (data) => {
      if (data.page.inputPath.endsWith("index.md")) return "index.html";
      return data.permalink;
    };
  });
  
  return {
    markdownTemplateEngine: "liquid",
    htmlTemplateEngine: "liquid",
    dir: { input: "src/site/notes", output: "_site" }
  };
};
