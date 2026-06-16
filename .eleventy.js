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
      
      // Находим все вики-ссылки [[...]] в тексте статьи
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

      // === ШАГ 2: СБОРКА САЙДБАРА ИЗ ГОТОВОГО HTML ОГЛАВЛЕНИЯ ===
      const currentFolder = this.page.inputPath.split("/").reverse()[1]; 

      // База всех страниц текущей книги
      const currentBookCollection = global.eleventyCollectionsAll ? 
        global.eleventyCollectionsAll.filter(p => p.inputPath && p.inputPath.includes(`/${currentFolder}/`)) : [];

      // Находим файл оглавления книги строго по типу index
      const indexPage = currentBookCollection.find(p => {
        if (!p.data) return false;
        const pType = p.data.type || (p.data.data ? p.data.data.type : "");
        return String(pType).toLowerCase().trim() === "index";
      });

      let sidebarHtml = `<nav class="sidebar-nav">
        <div class="sidebar-back-link">
          <a href="/digital-garden/">← На главную</a>
        </div>`;

      let currentBookTitle = currentFolder.charAt(0).toUpperCase() + currentFolder.slice(1);
      let menuContentHtml = "";

      if (indexPage) {
        if (indexPage.data && indexPage.data.title) {
          currentBookTitle = indexPage.data.title;
        }

        const indexHtmlContent = indexPage.content || "";

        if (indexHtmlContent) {
          // БРОНЕБОЙНЫЙ ПАРСЕР: Разбиваем HTML на куски по открывающим тегам списков <ul>
          const rawSections = indexHtmlContent.split(/<ul[^>]*>/i);
          
          // Первый кусок — это текст до самого первого списка, пропускаем его
          for (let i = 1; i < rawSections.length; i++) {
            const previousChunk = rawSections[i - 1];
            const currentChunk = rawSections[i];

            // Из куска ДО списка вытаскиваем текст последнего жирного тега (заголовок секции)
            const strongMatches = [...previousChunk.matchAll(/<(strong|b)>([\s\S]*?)<\/\1>/gi)];
            let sectionTitle = "Раздел";
            if (strongMatches.length > 0) {
              sectionTitle = strongMatches[strongMatches.length - 1][2].replace(/<[^>]*>/g, "").trim();
            }

            // Из текущего куска забираем только внутренности текущего списка до закрывающего </ul>
            const ulEndIndex = currentChunk.toLowerCase().indexOf("</ul>");
            if (ulEndIndex !== -1) {
              let ulInner = currentChunk.substring(0, ulEndIndex);

              // Подсвечиваем активный элемент, если читатель находится на этой странице
              const currentUrlChunk = this.page.url;
              if (currentUrlChunk) {
                const escapedUrl = currentUrlChunk.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                const activeLiRegex = new RegExp(`(<li[^>]*>\\s*<a\\s+href="[^"]*${escapedUrl}"[^>]*>)`, "i");
                ulInner = ulInner.replace(activeLiRegex, '<li class="active-node">$1');
              }

              // Собираем чистый HTML блок для сайдбара
              menuContentHtml += `<div class="sidebar-menu-section">`;
              menuContentHtml += `<span class="menu-section-title">${sectionTitle}</span>`;
              menuContentHtml += `<ul>${ulInner}</ul>`;
              menuContentHtml += `</div><hr class="menu-divider">`;
            }
          }
        }
      }

      // Собираем заголовок книги
      sidebarHtml += `<h3>${currentBookTitle}</h3>`;
      
      // ГАРАНТИРОВАННО ВШИВАЕМ ССЫЛКУ НА ОГЛАВЛЕНИЕ НА САМЫЙ ВЕРХ
      if (indexPage) {
        const isIndexActive = (indexPage.url === this.page.url) ? 'class="active-node"' : '';
        sidebarHtml += `<ul class="menu-section-main">
          <li ${isIndexActive}><a href="/digital-garden${indexPage.url}">📌 Главная страница книги</a></li>
        </ul><hr class="menu-divider">`;
      }

      // Если наш новый построчный парсер собрал меню — выводим его
      if (menuContentHtml) {
        sidebarHtml += menuContentHtml;
        sidebarHtml = sidebarHtml.replace(/<hr class="menu-divider"><\/nav>$/, "</nav>");
      } else {
        // Если даже это не сработало — выводим базовый плоский список как крайний аварийный случай
        sidebarHtml += `<ul class="menu-section-list">`;
        currentBookCollection.forEach(note => {
          if (note.url !== (indexPage ? indexPage.url : "")) {
            const isActive = (note.url === this.page.url) ? 'class="active-node"' : '';
            const displayTitle = note.data && note.data.title ? note.data.title : note.fileSlug.replace(/[-_]/g, ' ');
            sidebarHtml += `<li ${isActive}><a href="/digital-garden${note.url}">${displayTitle}</a></li>`;
          }
        });
        sidebarHtml += `</ul>`;
      }

      sidebarHtml += `</nav>`;

      // Тег TITLE страницы
      const pageTitle = this.page.fileSlug ? this.page.fileSlug.replace(/[-_]/g, ' ') : "Цифровой Сад";

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

    <script>
        document.addEventListener("DOMContentLoaded", function() {
            var sidebar = document.querySelector(".sidebar-nav");
            if (!sidebar) return;

            var scrollTop = sessionStorage.getItem("sidebar-scroll");
            if (scrollTop) {
                sidebar.scrollTop = parseInt(scrollTop, 10);
            }

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
