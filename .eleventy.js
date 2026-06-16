const markdownIt = require("markdown-it");

module.exports = function(eleventyConfig) {
  // Копируем файл стилей в корень сайта
  eleventyConfig.addPassthroughCopy("style.css");

  // === ШАГ 1: АВТОМАТИЧЕСКАЯ СОРТИРОВАННАЯ КОЛЛЕКЦИЯ ДЛЯ МЕНЮ ===
  eleventyConfig.addCollection("confiteor", function(collectionApi) {
    return collectionApi.getFilteredByGlob("src/site/notes/confiteor/**/*.md")
      .sort((a, b) => {
        return a.fileSlug.localeCompare(b.fileSlug, 'ru', { numeric: true });
      });
  });

  // Стандартная поддержка пермалинков
  eleventyConfig.addGlobalData("permalink", (data) => {
    if (!data || !data.page) return undefined;
    return data.permalink || undefined; 
  });

  let markdownLib = markdownIt({ html: true });
  eleventyConfig.setLibrary("md", markdownLib);

  // УМНЫЙ ТРАНСФОРМЕР ССЫЛОК И ВЕРСТКИ
  eleventyConfig.addTransform("wrap-and-fix-links", function(content, outputPath) {
    if (outputPath && outputPath.endsWith(".html")) {
      
      // Находим все вики-ссылки [[...]]
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

        // РЕЗЕРВНЫЙ ВАРИАНТ
        let folder = rawPath.toLowerCase().includes("confiteor") ? "confiteor" : "sense";
        let cleanName = targetFileName.replace(/^(i|ii|iii|iv)\.\s*/i, "").replace(/_/g, "-");
        
        if (folder === "sense" && cleanName.includes(" и ")) {
          cleanName = cleanName.split(" и ")[0].trim();
        }
        
        let fallbackSlug = cleanName.replace(/\s+/g, "-");
        
        if (targetFileName === "обсуждение") fallbackSlug = "obsuzhdenie";
        if (targetFileName.startsWith("формулы адриана")) fallbackSlug = "formuly-adriana";

        if (folder === "confiteor") {
          const numMatch = targetFileName.match(/Подраздел\s+(\d+)/i);
          if (numMatch) {
            const num = numMatch[1].padStart(2, '0');
            fallbackSlug = (num === "34") ? `35-palimpsestus-podrazdel-34` : `${num}-${fallbackSlug}`;
          }
        }

        return `<a href="/digital-garden/${folder}/${fallbackSlug}/">${linkText}</a>`;
      });

      // === ШАГ 2: УНИВЕРСАЛЬНЫЙ СБОРЩИК БОКОВОГО МЕНЮ С ГРУППИРОВКОЙ ===
      // Автоматически определяем текущую папку книги (например, "confiteor" или "sense")
      const currentFolder = this.page.inputPath.split("/").reverse()[1]; 

      // Достаем из глобальной базы ВСЕ файлы этой конкретной книги
      const currentBookCollection = global.eleventyCollectionsAll ? 
        global.eleventyCollectionsAll.filter(p => p.inputPath && p.inputPath.includes(`/${currentFolder}/`)) : [];

      // Динамический поиск красивого названия книги на основе файла оглавления
      const mainPageOfBook = currentBookCollection.find(p => {
        const pType = p.data.type ? p.data.type.toLowerCase().trim() : "";
        return pType === "index" || pType === "main" || p.fileSlug.toLowerCase().includes("сюжет");
      });

      const currentBookTitle = mainPageOfBook && mainPageOfBook.data.title ? 
        mainPageOfBook.data.title : 
        currentFolder.charAt(0).toUpperCase() + currentFolder.slice(1).replace(/[-_]/g, ' ');

      // Распределяем файлы текущей папки по категориям на основе твоих свойств type
      let mainLinks = [];
      let characterLinks = [];
      let objectLinks = [];
      let textLinks = [];

      currentBookCollection.forEach(note => {
        const noteType = note.data.type ? note.data.type.toLowerCase().trim() : "";
        const fileName = note.fileSlug.toLowerCase();

        if (noteType === "index" || noteType === "main" || fileName.includes("сюжет")) {
          mainLinks.push(note);
        } else if (noteType === "character" || noteType === "movement") {
          characterLinks.push(note);
        } else if (noteType === "object") {
          objectLinks.push(note);
        } else {
          textLinks.push(note);
        }
      });

      // Индивидуальная сортировка каждой группы
      mainLinks.sort((a, b) => a.fileSlug.localeCompare(b.fileSlug, 'ru'));
      characterLinks.sort((a, b) => a.fileSlug.localeCompare(b.fileSlug, 'ru'));
      objectLinks.sort((a, b) => a.fileSlug.localeCompare(b.fileSlug, 'ru'));
      textLinks.sort((a, b) => a.fileSlug.localeCompare(b.fileSlug, 'ru', { numeric: true }));

      // Вспомогательная функция для сборки списков ссылок
      const generateListHtml = (collection) => {
        let html = "";
        collection.forEach(note => {
          const isActive = (note.url === this.page.url) ? 'class="active-node"' : '';
          const displayTitle = note.data.title || note.fileSlug.replace(/[-_]/g, ' ');
          html += `<li ${isActive}><a href="/digital-garden${note.url}">${displayTitle}</a></li>`;
        });
        return html;
      };

      // Сборка структурированного HTML для сайдбара
      let sidebarHtml = `<nav class="sidebar-nav">
        <div class="sidebar-back-link">
          <a href="/digital-garden/">← На главную</a>
        </div>
        
        <h3>${currentBookTitle}</h3>`;

      if (mainLinks.length > 0) {
        sidebarHtml += `<ul class="menu-section-main">${generateListHtml(mainLinks)}</ul><hr class="menu-divider">`;
      }
      if (characterLinks.length > 0) {
        sidebarHtml += `<span class="menu-section-title">Сюжет и персонажи</span>`;
        sidebarHtml += `<ul class="menu-section-characters">${generateListHtml(characterLinks)}</ul><hr class="menu-divider">`;
      }
      if (objectLinks.length > 0) {
        sidebarHtml += `<span class="menu-section-title">Артефакты и предметы</span>`;
        sidebarHtml += `<ul class="menu-section-objects">${generateListHtml(objectLinks)}</ul><hr class="menu-divider">`;
      }
      if (textLinks.length > 0) {
        sidebarHtml += `<span class="menu-section-title">Подразделы книги</span>`;
        sidebarHtml += `<ul class="menu-section-text">${generateListHtml(textLinks)}</ul>`;
      }
      sidebarHtml += `</nav>`;

      // ВЫЧИСЛЯЕМ ЗАГОЛОВОК СТРАНИЦЫ ДЛЯ ТЕГА TITLE
      const pageTitle = this.page.fileSlug ? this.page.fileSlug.replace(/[-_]/g, ' ') : "Цифровой Сад";

      // ПРОВЕРКА: Если мы на глобальной главной, то полностью скрываем меню
      const isMainPage = (this.page.url === "/" || this.page.url === "/index.html");
      const bodyClass = isMainPage ? "main-page-layout" : "";
      const renderSidebar = isMainPage ? "" : sidebarHtml;

      // === ШАГ 3: ДВУХКОЛОНОЧНЫЙ HTML ШАБЛОН ===
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
</body>
</html>`;
    }
    return content;
  });

  // Сохраняем коллекцию в глобальную видимость на этапе сборки
  eleventyConfig.addCollection("allPagesGlobal", function(collectionApi) {
    global.eleventyCollectionsAll = collectionApi.getAll();
    return global.eleventyCollectionsAll;
  });

  // Гарантируем правильное имя для главной страницы
  eleventyConfig.addGlobalData("eleventyComputed.permalink", () => {
    return (data) => {
      if (data.page.inputPath.endsWith("index.md")) {
        return "index.html";
      }
      return data.permalink;
    };
  });
  
  return {
    markdownTemplateEngine: "liquid",
    htmlTemplateEngine: "liquid",
    dir: {
      input: "src/site/notes",
      output: "_site"
    }
  };
};
