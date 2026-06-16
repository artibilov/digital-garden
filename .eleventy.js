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
      
      // 1. Исправление вики-ссылок [[...]]
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

      // 2. Сборка сайдбара из технического файла конфигурации
      const currentFolder = this.page.inputPath.split("/").reverse()[1]; 

      const currentBookCollection = global.eleventyCollectionsAll ? 
        global.eleventyCollectionsAll.filter(p => p.inputPath && p.inputPath.includes(`/${currentFolder}/`)) : [];

      // Ищем файл конфигурации навигации
      const configPage = currentBookCollection.find(p => p.data && p.data.type === "sidebar-config");

      // Ищем главную страницу книги для красивого заголовка в шапке
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

      // Ссылка на Оглавление железно наверх
      if (indexPage) {
        const isIndexActive = (indexPage.url === this.page.url) ? 'class="active-node"' : '';
        sidebarHtml += `<ul class="menu-section-main">
          <li ${isIndexActive}><a href="/digital-garden${indexPage.url}">📌 Главная страница книги</a></li>
        </ul><hr class="menu-divider">`;
      }

      // Рендерим секции, если нашли sidebar-config
      if (configPage && configPage.data && Array.isArray(configPage.data.sections)) {
        configPage.data.sections.forEach(section => {
          const sectionTitle = section.title;
          const fileList = section.files || [];

          if (fileList.length > 0) {
            let sectionLiHtml = "";

            fileList.forEach(slugName => {
              const cleanSlug = String(slugName).toLowerCase().trim();

              // Ищем страницу в коллекции Eleventy по имени файла
              const foundPage = currentBookCollection.find(page => {
                if (!page.inputPath) return false;
                const actualName = page.inputPath.split("/").pop().replace(".md", "").toLowerCase().trim();
                return actualName === cleanSlug;
              });

              if (foundPage && foundPage.url) {
                const isActive = (foundPage.url === this.page.url) ? 'class="active-node"' : '';
                
                // ВОТ ЗДЕСЬ МАГИЯ: берем русский title из frontmatter файла, если он там есть!
                const displayTitle = foundPage.data && foundPage.data.title ? foundPage.data.title : foundPage.fileSlug.replace(/[-_]/g, ' ');
                
                sectionLiHtml += `<li ${isActive}><a href="/digital-garden${foundPage.url}">${displayTitle}</a></li>`;
              }
            });

            if (sectionLiHtml) {
              sidebarHtml += `<div class="sidebar-menu-section">`;
              sidebarHtml += `<span class="menu-section-title">${sectionTitle}</span>`;
              sidebarHtml += `<ul>${sectionLiHtml}</ul>`;
              sidebarHtml += `</div><hr class="menu-divider">`;
            }
          }
        });

        sidebarHtml = sidebarHtml.replace(/<hr class="menu-divider"><\/nav>$/, "</nav>");
      } else {
        // Фолбэк на случай отсутствия конфига
        sidebarHtml += `<ul class="menu-section-list">`;
        currentBookCollection.forEach(note => {
          if (note.data && note.data.type !== "sidebar-config" && note.url !== (indexPage ? indexPage.url : "")) {
            const isActive = (note.url === this.page.url) ? 'class="active-node"' : '';
            const displayTitle = note.data && note.data.title ? note.data.title : note.fileSlug.replace(/[-_]/g, ' ');
            sidebarHtml += `<li ${isActive}><a href="/digital-garden${note.url}">${displayTitle}</a></li>`;
          }
        });
        sidebarHtml += `</ul>`;
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
